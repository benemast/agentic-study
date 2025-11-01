# backend/app/orchestrator/tools/analysis_tools.py
from typing import Dict, Any, List, Optional, Callable
import logging
import time
from collections import Counter
import asyncio
from app.orchestrator.tools.base_tool import BaseTool

logger = logging.getLogger(__name__)

class ReviewSentimentAnalysisTool(BaseTool):
    """
    LLM-Powered Sentiment Analysis + Theme Extraction

    Analyzes sentiment AND extracts key themes/topics from customer reviews.
    Identifies what customers discuss most and how they feel about specific aspects.
    
    Features:
    - Sentiment classification (positive/neutral/negative)
    - Theme/topic extraction (e.g., "sound quality", "comfort", "battery life")
    - Theme-sentiment correlation (how customers feel about each theme)
    - Batch processing with streaming progress
    - Real-time WebSocket updates
    - Confidence scoring and reasoning
    
    Output Structure:
    - Enriched records with sentiment columns
    - Theme analysis grouped by sentiment or combined
    - Theme percentages (optional)
    - Overall sentiment distribution
    """
    
    BATCH_SIZE = 500  # Reviews per LLM call
    MAX_REVIEWS = 1000  # Cost protection limit
    RECOMMENDED_MAX = 500  # Warn above this

    # Keyword lists for text analysis fallback
    POSITIVE_KEYWORDS = {
        'excellent', 'amazing', 'great', 'perfect', 'love', 'best',
        'awesome', 'fantastic', 'wonderful', 'superb', 'outstanding',
        'highly recommend', 'impressed', 'satisfied', 'quality', 'comfortable',
        'durable', 'worth', 'reliable', 'beautiful', 'nice'
    }
    
    NEGATIVE_KEYWORDS = {
        'terrible', 'awful', 'horrible', 'worst', 'bad', 'poor',
        'disappointed', 'waste', 'defective', 'broken', 'cheap',
        'uncomfortable', 'overpriced', 'regret', 'useless', 'junk',
        'hate', 'never', 'avoid', 'not recommend', 'fell apart'
    }
    
    def __init__(self):
        super().__init__(
            name="Review Sentiment Analysis",
            timeout=600  # 10 minutes
        )
        self.websocket_manager = None   # Injected by orchestrator
        self.llm_client = None          # Injected by orchestrator
    
    async def _send_progress(
        self, 
        session_id: str, 
        execution_id: int, 
        step: str, 
        progress: int,
        details: str = None
    ):
        """Send progress update via WebSocket"""

        if self.websocket_manager and session_id:
            try:
                await self.websocket_manager.send_to_session(session_id, {
                    'type': 'sentiment_analysis_progress',
                    'execution_id': execution_id,
                    'tool_name': self.name,
                    'step': step,
                    'progress': progress,
                    'details': details
                })
            except Exception as e:
                logger.error(f"Failed to send progress update: {e}")

    async def _analyze_batch_with_themes(
        self, 
        reviews_batch: List[Dict[str, Any]],
        extract_themes: bool,
        session_id: Optional[str] = None,
        execution_id: Optional[int] = None,
        batch_num: int = 1,
        total_batches: int = 1
    ) -> Dict[str, Any]:
        """
        Analyze batch of reviews for sentiment AND themes using LLM
        
        Returns:
            {
                'analyzed_reviews': List[Dict] with sentiment fields,
                'batch_themes': List[str] themes mentioned in this batch
            }
        """
        # Build review text for prompt
        reviews_text = ""
        for i, review in enumerate(reviews_batch, 1):
            star_rating = review.get('star_rating', 'N/A')
            headline = review.get('review_headline', '')[:100]
            body = review.get('review_body', '')[:600]
            
            reviews_text += f"""
--- Review {i} ---
Rating: {star_rating} stars
Headline: {headline}
Body: {body}
"""
        
        # Dynamic system prompt based on theme extraction
        if extract_themes:
            system_prompt = """You are a sentiment analysis expert for product reviews.
Analyze each review and:
1. Classify sentiment as 'positive', 'neutral', or 'negative'
2. Extract key themes/topics the customer discusses (e.g., "sound quality", "comfort", "battery life", "durability")

## Considerations
- **Star rating**: Use as a supporting feature, but secondary to the written text.
- **Text sentiment**: Focus on expressions of satisfaction, praise, or complaints in the review.
- **Context and nuance**: Account for sarcasm, subtlety, or mixed emotions where present.

## Sentiment Classification Criteria
- **Positive**: Indicates satisfaction, willingness to recommend, or explicit praise for the product.
- **Neutral**: Shows mixed or balanced feelings, moderate or factual feedback.
- **Negative**: Communicates dissatisfaction, complaints, cautions, or warnings.

Themes:
- Extract 2-4 specific topics per review
- Use customer language (not generic categories)
- Focus on product aspects mentioned (e.g., "bass quality" not just "sound")

Return JSON with this EXACT structure:
```json
{
  "reviews": [
    {
      "review_number": 1,
      "sentiment": "positive",
      "confidence": "high",
      "reasoning": "Customer highly satisfied with sound quality and comfort",
      "themes": ["sound quality", "comfort", "value for money"]
    }
    // Repeat for each review, using review_number 1, 2, 3, ...
  ]
}
```
- Ensure ALL reviews provided are analyzed and included, numbered sequentially starting from 1.
After reviewing all results, validate that all required output fields are present and every review is included. If any output issue is detected, self-correct before returning your final output."""
        else:
            # Sentiment-only prompt (no themes)
            system_prompt = """Developer: # Role and Objective
You are an expert in sentiment analysis, specializing in classifying product reviews.

# Instructions
Begin with a concise checklist (3-7 bullets) of how you will approach the sentiment analysis task; keep items conceptual, not implementation-level.
- For each product review, analyze and classify its sentiment as **'positive'**, **'neutral'**, or **'negative'**.
- Prioritize the text content of the review over the star rating when assessing sentiment.

## Considerations
- **Star rating**: Use as a supporting feature, but secondary to the written text.
- **Text sentiment**: Focus on expressions of satisfaction, praise, or complaints in the review.
- **Context and nuance**: Account for sarcasm, subtlety, or mixed emotions where present.

## Sentiment Classification Criteria
- **Positive**: Indicates satisfaction, willingness to recommend, or explicit praise for the product.
- **Neutral**: Shows mixed or balanced feelings, moderate or factual feedback.
- **Negative**: Communicates dissatisfaction, complaints, cautions, or warnings.

# Output Format
- Set reasoning_effort=medium to ensure a sufficient depth of analysis appropriate for nuanced sentiment tasks.
Return results in the following JSON format:
```json
{
  "reviews": [
    {
      "review_number": 1,
      "sentiment": "positive",
      "confidence": "high",
      "reasoning": "Customer satisfied"
    }
    // Repeat for each review, using review_number 1, 2, 3, ...
  ]
}
```
- Ensure ALL reviews provided are analyzed and included, numbered sequentially starting from 1.
After reviewing all results, validate that all required output fields are present and every review is included. If any output issue is detected, self-correct before returning your final output."""
        
        user_prompt = f"""Analyze these {len(reviews_batch)} product reviews:
{reviews_text}

Return JSON with analysis for each review."""
        
        # Send batch start notification
        if self.websocket_manager and session_id:
            try:
                await self.websocket_manager.send_to_session(session_id, {
                    'type': 'sentiment_batch_start',
                    'execution_id': execution_id,
                    'batch_number': batch_num,
                    'total_batches': total_batches,
                    'reviews_in_batch': len(reviews_batch),
                    'progress_percentage': int((batch_num - 1) / total_batches * 100)
                })
            except Exception as e:
                logger.warning(f"Failed to send batch start: {e}")
        
        # Streaming callback
        chunk_count = [0]
        last_update = [0]
        
        async def on_thinking_chunk(chunk: str):
            """Show 'thinking' activity during LLM processing"""
            chunk_count[0] += 1
            # Send thinking update every 25 chunks (reduces message spam)
            if chunk_count[0] - last_update[0] >= 25 and self.websocket_manager and session_id:
                try:
                    await self.websocket_manager.send_to_session(session_id, {
                        'type': 'sentiment_thinking',
                        'execution_id': execution_id,
                        'batch_number': batch_num,
                        'chunks_received': chunk_count[0]
                    })
                    last_update[0] = chunk_count[0]
                except Exception as e:
                    logger.warning(f"Failed to send thinking update: {e}")
        
        try:
            logger.info(f"Calling LLM for batch {batch_num}/{total_batches}")
            
            # Call LLM with streaming
            response = await self.llm_client.get_structured_decision(
                prompt=user_prompt,
                system_prompt=system_prompt,
                expected_fields=['reviews'],
                stream=True,
                on_chunk=on_thinking_chunk
            )
            
            # Map LLM results to reviews
            analyzed_reviews = []
            batch_themes = []  # Collect themes from this batch
            llm_results = response.get('reviews', [])
            
            logger.info(f"LLM returned {len(llm_results)} review analyses")
            
            for i, review in enumerate(reviews_batch):
                # Find matching LLM result
                llm_result = None
                for result in llm_results:
                    if result.get('review_number') == i + 1:
                        llm_result = result
                        break
                
                if not llm_result and i < len(llm_results):
                    llm_result = llm_results[i]  # Fallback by position
                
                if llm_result:
                    # Build analyzed review
                    analyzed_review = {
                        **review,
                        'sentiment': llm_result.get('sentiment', 'neutral'),
                        'sentiment_confidence': llm_result.get('confidence', 'medium'),
                        'sentiment_reasoning': llm_result.get('reasoning', 'No reasoning provided')
                    }
                    
                    # Add themes if extracted
                    if extract_themes and 'themes' in llm_result:
                        themes = llm_result.get('themes', [])
                        analyzed_review['themes'] = themes
                        batch_themes.extend(themes)  # Collect for aggregation
                    
                    analyzed_reviews.append(analyzed_review)
                else:
                    # Fallback if LLM didn't return result
                    analyzed_reviews.append({
                        **review,
                        'sentiment': self._fallback_sentiment(review.get('star_rating', 3)),
                        'sentiment_confidence': 'low',
                        'sentiment_reasoning': 'LLM analysis missing, used rating fallback',
                        'themes': [] if extract_themes else None
                    })
            
            # Send batch complete
            if self.websocket_manager and session_id:
                try:
                    await self.websocket_manager.send_to_session(session_id, {
                        'type': 'sentiment_batch_complete',
                        'execution_id': execution_id,
                        'batch_number': batch_num,
                        'reviews_analyzed': len(analyzed_reviews),
                        'progress_percentage': int(batch_num / total_batches * 100)
                    })
                except Exception as e:
                    logger.warning(f"Failed to send batch complete: {e}")
            
            return {
                'analyzed_reviews': analyzed_reviews,
                'batch_themes': batch_themes
            }
            
        except Exception as e:
            logger.error(f"LLM batch analysis failed: {e}", exc_info=True)
            
            # Fallback: rating-based sentiment
            return {
                'analyzed_reviews': [
                    {
                        **review,
                        'sentiment': self._fallback_sentiment(review.get('star_rating', 3)),
                        'sentiment_confidence': 'low',
                        'sentiment_reasoning': f'LLM failed ({type(e).__name__}), used rating fallback',
                        'themes': [] if extract_themes else None
                    }
                    for review in reviews_batch
                ],
                'batch_themes': []
            }
    
    def _fallback_sentiment(self, star_rating: int) -> str:
        """Fallback sentiment based on rating"""
        if star_rating >= 4:
            return 'positive'
        elif star_rating == 3:
            return 'neutral'
        else:
            return 'negative'
    
    def _aggregate_themes(
        self, 
        analyzed_reviews: List[Dict[str, Any]],
        theme_separation: str,
        max_themes_per_category: int,
        include_percentages: bool
    ) -> Dict[str, Any]:
        """
        Aggregate themes across all reviews
        
        Returns theme analysis with counts/percentages
        Percentages show: "What % of reviews mention this theme?"
        """
        if theme_separation == 'by_sentiment':
            # Separate themes by sentiment
            # Track UNIQUE REVIEWS per theme (not just mentions)
            positive_themes = {}  # theme -> set of review_ids
            neutral_themes = {}
            negative_themes = {}
            
            for review in analyzed_reviews:
                review_id = review.get('review_id')
                sentiment = review.get('sentiment', 'neutral')
                themes = review.get('themes', [])
                
                # Count each theme once per review (deduplicate)
                seen_in_review = set()
                for theme in themes:
                    theme_lower = theme.lower()
                    if theme_lower not in seen_in_review:
                        seen_in_review.add(theme_lower)
                        
                        if sentiment == 'positive':
                            if theme_lower not in positive_themes:
                                positive_themes[theme_lower] = set()
                            positive_themes[theme_lower].add(review_id)
                        elif sentiment == 'neutral':
                            if theme_lower not in neutral_themes:
                                neutral_themes[theme_lower] = set()
                            neutral_themes[theme_lower].add(review_id)
                        else:
                            if theme_lower not in negative_themes:
                                negative_themes[theme_lower] = set()
                            negative_themes[theme_lower].add(review_id)
            
            # Convert sets to counts
            positive_counts = Counter({theme: len(review_ids) for theme, review_ids in positive_themes.items()})
            neutral_counts = Counter({theme: len(review_ids) for theme, review_ids in neutral_themes.items()})
            negative_counts = Counter({theme: len(review_ids) for theme, review_ids in negative_themes.items()})
            
            # Count reviews per sentiment for accurate percentages
            positive_review_count = sum(1 for r in analyzed_reviews if r.get('sentiment') == 'positive')
            neutral_review_count = sum(1 for r in analyzed_reviews if r.get('sentiment') == 'neutral')
            negative_review_count = sum(1 for r in analyzed_reviews if r.get('sentiment') == 'negative')
            
            # Build result structure
            result = {
                'type': 'by_sentiment',
                'positive_themes': self._format_themes(
                    positive_counts, 
                    max_themes_per_category, 
                    positive_review_count, 
                    include_percentages
                ),
                'neutral_themes': self._format_themes(
                    neutral_counts, 
                    max_themes_per_category, 
                    neutral_review_count, 
                    include_percentages
                ),
                'negative_themes': self._format_themes(
                    negative_counts, 
                    max_themes_per_category, 
                    negative_review_count, 
                    include_percentages
                )
            }
        else:
            # Combined themes (all sentiments together)
            # Track unique reviews per theme
            theme_reviews = {}  # theme -> set of review_ids
            
            for review in analyzed_reviews:
                review_id = review.get('review_id')
                themes = review.get('themes', [])
                
                # Deduplicate within review
                seen_in_review = set()
                for theme in themes:
                    theme_lower = theme.lower()
                    if theme_lower not in seen_in_review:
                        seen_in_review.add(theme_lower)
                        
                        if theme_lower not in theme_reviews:
                            theme_reviews[theme_lower] = set()
                        theme_reviews[theme_lower].add(review_id)
            
            # Convert to counts
            theme_counts = Counter({theme: len(review_ids) for theme, review_ids in theme_reviews.items()})
            total_reviews = len(analyzed_reviews)
            
            result = {
                'type': 'combined',
                'themes': self._format_themes(
                    theme_counts, 
                    max_themes_per_category, 
                    total_reviews, 
                    include_percentages
                )
            }
        
        return result
    
    def _format_themes(
        self, 
        theme_counter: Counter, 
        max_count: int, 
        total_reviews: int,
        include_percentages: bool
    ) -> List[Dict[str, Any]]:
        """Format themes with counts and optional percentages"""
        top_themes = theme_counter.most_common(max_count)
        
        formatted = []
        for theme, count in top_themes:
            theme_data = {
                'theme': theme,
                'count': count
            }
            
            if include_percentages:
                percentage = (count / total_reviews * 100) if total_reviews > 0 else 0
                theme_data['percentage'] = round(percentage, 2)
            
            formatted.append(theme_data)
        
        return formatted
    
    def _sample_reviews_strategically(
        self, 
        reviews: List[Dict[str, Any]], 
        target_count: int
    ) -> List[Dict[str, Any]]:
        """Sample reviews maintaining rating distribution"""
        # Group by rating
        by_rating = {}
        for review in reviews:
            rating = review.get('star_rating', 3)
            if rating not in by_rating:
                by_rating[rating] = []
            by_rating[rating].append(review)
        
        # Calculate sampling proportions
        sampled = []
        for rating in sorted(by_rating.keys()):
            rating_reviews = by_rating[rating]
            proportion = len(rating_reviews) / len(reviews)
            sample_size = max(1, int(target_count * proportion))
            
            # Sample this rating group
            if len(rating_reviews) <= sample_size:
                sampled.extend(rating_reviews)
            else:
                import random
                sampled.extend(random.sample(rating_reviews, sample_size))
        
        return sampled[:target_count]
    
    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute sentiment analysis with theme extraction
        
        Args:
            input_data: {
                'records': List[Dict],              # Direct access (no 'data' wrapper)
                'total': int,                       # Optional
                'category': str,                    # Optional
                'config': Dict[str, Any]            # Parameters in config object
                    'extract_themes': bool - Extract recurring topics/themes from reviews (default: True),
                    'theme_separation': Literal['combined', 'by_sentiment'] - How to organize themes: 'combined' (all together) or 'by_sentiment' (positive/negative separate),
                    'max_themes_per_category': int - Maximum number of themes to extract per category (default: 1),
                    'include_percentages': bool - Calculate percentage of reviews mentioning each theme (default: True)
                    'batch_size': int
                },
                'state': {                       # State in state object
                    'session_id': str,
                    'execution_id': int,
                    'condition': str
                }
                'session_id': str - For WebSocket updates (optional),
                'execution_id': int - For WebSocket updates (optional)
            }
        
        Returns:
            {
                'success': bool,
                'data': {
                    'column_data': Dict[review_id, sentiment_fields],
                    'columns_added': List[str],
                    'tool_results': {
                        'sentiment_summary': {...},
                        'theme_analysis': {...}
                    }
                }
            }
        """
        start_time = time.time()
        
        try:
            self._log_input_to_file(input_data)

            reviews = input_data.get('records', [])
            
            # Extract config parameters from 'config' object
            config = input_data.get('config', {})
            extract_themes = config.get('extract_themes', True)
            theme_separation = config.get('theme_separation', 'combined')
            max_themes_per_category = config.get('max_themes_per_category', 5)
            include_percentages = config.get('include_percentages', True)
            batch_size = config.get('batch_size', self.BATCH_SIZE)
            
            # State info
            state = input_data.get('state', {})
            session_id = state.get('session_id')
            execution_id = state.get('execution_id')
            
            if not reviews:
                return {
                    'success': False,
                    'error': 'No reviews provided',
                    'data': None
                }
            
            original_count = len(reviews)
            
            logger.info(
                f"Starting sentiment analysis: {original_count} reviews, "
                f"extract_themes={extract_themes}, theme_separation={theme_separation}"
            )
            
            # Cost protection: Sample if too large
            if original_count > self.MAX_REVIEWS:
                await self._send_progress(
                    session_id, execution_id,
                    "Large dataset - sampling",
                    5,
                    f"Sampling {self.MAX_REVIEWS} from {original_count} reviews"
                )
                reviews = self._sample_reviews_strategically(reviews, self.MAX_REVIEWS)
                logger.warning(f"Sampled dataset: {original_count} → {len(reviews)} reviews")
            
            # Batch processing
            await self._send_progress(
                session_id, execution_id,
                "Starting analysis",
                10,
                f"Processing {len(reviews)} reviews in batches"
            )
            
            analyzed_reviews = []
            all_themes = []
            
            total_batches = (len(reviews) + batch_size - 1) // batch_size
            
            for batch_idx in range(0, len(reviews), batch_size):
                batch = reviews[batch_idx:batch_idx + batch_size]
                batch_num = (batch_idx // batch_size) + 1
                
                # Analyze this batch
                batch_result = await self._analyze_batch_with_themes(
                    reviews_batch=batch,
                    extract_themes=extract_themes,
                    session_id=session_id,
                    execution_id=execution_id,
                    batch_num=batch_num,
                    total_batches=total_batches
                )
                
                analyzed_reviews.extend(batch_result['analyzed_reviews'])
                all_themes.extend(batch_result['batch_themes'])
                
                # Small delay between batches
                if batch_idx + batch_size < len(reviews):
                    await asyncio.sleep(0.1)
            
            # Calculate sentiment distribution
            sentiment_counts = Counter()
            for review in analyzed_reviews:
                sentiment = review.get('sentiment', 'neutral')
                sentiment_counts[sentiment] += 1
            
            total_analyzed = len(analyzed_reviews)
            
            sentiment_summary = {
                'positive': sentiment_counts['positive'],
                'neutral': sentiment_counts['neutral'],
                'negative': sentiment_counts['negative'],
                'total': total_analyzed,
                'percentages': {
                    'positive': round(sentiment_counts['positive'] / total_analyzed * 100, 2),
                    'neutral': round(sentiment_counts['neutral'] / total_analyzed * 100, 2),
                    'negative': round(sentiment_counts['negative'] / total_analyzed * 100, 2)
                },
                'dominant_sentiment': max(sentiment_counts, key=sentiment_counts.get)
            }
            
            # Aggregate themes if extracted
            theme_analysis = None
            if extract_themes:
                theme_analysis = self._aggregate_themes(
                    analyzed_reviews,
                    theme_separation,
                    max_themes_per_category,
                    include_percentages
                )
                logger.info(f"Extracted {len(all_themes)} total theme mentions")
            
            # Prepare column data for enrichment (maps to shared_state)
            column_data = {}
            for review in analyzed_reviews:
                review_id = review['review_id']
                column_data[review_id] = {
                    'sentiment': review['sentiment'],
                    'sentiment_confidence': review['sentiment_confidence'],
                    'sentiment_reasoning': review['sentiment_reasoning']
                }
                
                if extract_themes:
                    column_data[review_id]['themes'] = review.get('themes', [])
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # Send completion
            if self.websocket_manager and session_id:
                try:
                    await self.websocket_manager.send_to_session(session_id, {
                        'type': 'sentiment_analysis_complete',
                        'execution_id': execution_id,
                        'total_reviews_analyzed': total_analyzed,
                        'dominant_sentiment': sentiment_summary['dominant_sentiment'],
                        'themes_extracted': len(all_themes) if extract_themes else 0,
                        'execution_time_ms': execution_time
                    })
                except Exception as e:
                    logger.warning(f"Failed to send completion: {e}")
            
            logger.info(
                f"✅ Sentiment analysis complete: "
                f"{sentiment_counts['positive']}+ {sentiment_counts['neutral']}= {sentiment_counts['negative']}- "
                f"({execution_time}ms)"
            )
            
            # Build result for shared_state mapping
            result_data = {
                # For apply_enrichment()
                'column_data': column_data,
                'columns_added': ['sentiment', 'sentiment_confidence', 'sentiment_reasoning'] + 
                                (['themes'] if extract_themes else []),
                
                # For tool_results registry
                'tool_results': {
                    'sentiment_summary': sentiment_summary,
                    'theme_analysis': theme_analysis,
                    'statistics': {
                        'reviews_analyzed': total_analyzed,
                        'batches_processed': total_batches,
                        'themes_extracted': len(all_themes) if extract_themes else 0,
                        'llm_model': self.llm_client.model
                    }
                }
            }
            
            results = {
                'success': True,
                'data': result_data,
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'reviews_analyzed': total_analyzed,
                    'dominant_sentiment': sentiment_summary['dominant_sentiment'],
                    'themes_extracted': extract_themes
                }
            }

            self._log_results_to_file(results)

            return results
            
        except Exception as e:
            logger.error(f"Error in ReviewSentimentAnalysisTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': None,
                'execution_time_ms': int((time.time() - start_time) * 1000)
            }

class GenerateInsightsTool(BaseTool):
    """
    Generate insights from analyzed data using LLM with STREAMING SUPPORT
    
    NEW FEATURES:
    - Streaming LLM calls for reduced latency (TTFB < 1s)
    - Real-time progress updates via WebSocket
    - Thinking indicators during LLM processing
    - Batch processing support (if needed)
    
    WebSocket Events:
    - insight_generation_start: When generation begins
    - insight_thinking: During LLM processing (throttled)
    - insight_generation_complete: When done
    """
    
    def __init__(self):
        super().__init__(
            name="Generate Insights",
            timeout=600  # 10 minutes for LLM processing
        )
        self.websocket_manager = None   # Injected by orchestrator
        self.llm_client = None          # Injected by orchestrator
    
    async def _generate_insights_with_llm(
        self,
        data: Dict[str, Any],
        on_chunk: Optional[Callable] = None
    ) -> List[str]:
        """
        Generate insights using streaming LLM
        
        Args:
            data: Analysis data (records, sentiment summary, etc.)
            on_chunk: Optional callback for streaming progress
            
        Returns:
            List of insight strings
        """
        
        # Build prompt from data
        records = data.get('records', [])
        sentiment_summary = data.get('sentiment_summary', {})
        
        # Calculate key metrics for context
        total_reviews = len(records)
        positive_count = sentiment_summary.get('positive', 0)
        neutral_count = sentiment_summary.get('neutral', 0)
        negative_count = sentiment_summary.get('negative', 0)
        
        # Calculate percentages
        positive_pct = (positive_count / max(total_reviews, 1)) * 100
        neutral_pct = (neutral_count / max(total_reviews, 1)) * 100
        negative_pct = (negative_count / max(total_reviews, 1)) * 100
        
        # Build compressed prompt
        prompt = f"""Generate 3-5 actionable insights from review data.

Data: {total_reviews} reviews
Sentiment: {positive_pct:.0f}% pos, {neutral_pct:.0f}% neu, {negative_pct:.0f}% neg

Output JSON: {{"insights": ["insight 1", "insight 2", "insight 3"]}}

Focus: trends, improvements, actions."""
        
        #OLD PROMPT
        # Build rich prompt
        """Analyze this product review data and generate 3-5 actionable business insights:

        **Data Summary:**
        - Total Reviews Analyzed: {total_reviews}
        - Sentiment Distribution:
        - Positive: {positive_count} ({positive_pct:.1f}%)
        - Neutral: {neutral_count} ({neutral_pct:.1f}%)
        - Negative: {negative_count} ({negative_pct:.1f}%)

        **Task:**
        Generate insights that:
        1. Identify key trends or patterns
        2. Highlight opportunities for improvement
        3. Note strengths or positive feedback themes
        4. Suggest concrete actions based on the data
        5. Address any concerning patterns in negative reviews

        **Output Format (JSON):**
        {{
        "insights": [
            "Insight 1: [Specific, actionable insight]",
            "Insight 2: [Specific, actionable insight]",
            "Insight 3: [Specific, actionable insight]"
        ]
        }}

        Make insights specific, data-driven, and actionable for product managers or business stakeholders.
        """

        #system_prompt = """Expert e-commerce analyst. Generate actionable insights from review data. Output valid JSON with 'insights' array."""
        system_prompt = """You are an expert data analyst and business strategist specializing in e-commerce product reviews.

Your role:
- Generate actionable insights from review sentiment data
- Focus on business value and concrete recommendations
- Be specific and data-driven
- Prioritize insights that drive decisions

Output must be valid JSON with an 'insights' array."""
        
        logger.debug("Calling LLM for insight generation with streaming")
        
        # Use streaming LLM call for reduced latency
        try:
            response = await self.llm_client.get_structured_decision(
                prompt=prompt,
                system_prompt=system_prompt,
                expected_fields=['insights'],
                stream=True,  # ✅ Enable streaming
                on_chunk=on_chunk  # ✅ Progress updates
            )
            
            insights = response.get('insights', [])
            
            if not insights:
                logger.warning("LLM returned empty insights list")
                # Fallback to basic insights
                insights = self._generate_fallback_insights(data)
            
            return insights
            
        except Exception as e:
            logger.error(f"LLM insight generation failed: {e}")
            # Return fallback insights
            return self._generate_fallback_insights(data)
    
    def _generate_fallback_insights(self, data: Dict[str, Any]) -> List[str]:
        """
        Generate basic insights without LLM (fallback)
        
        Args:
            data: Analysis data
            
        Returns:
            List of basic insights
        """
        records = data.get('records', [])
        sentiment_summary = data.get('sentiment_summary', {})
        insights = []
        
        if not records:
            return ["No data available for analysis"]
        
        # Calculate stats
        total = len(records)
        positive = sentiment_summary.get('positive', 0)
        negative = sentiment_summary.get('negative', 0)
        
        positive_pct = (positive / total) * 100 if total > 0 else 0
        negative_pct = (negative / total) * 100 if total > 0 else 0
        
        # Generate basic insights
        insights.append(f"Analyzed {total} product reviews")
        
        if positive_pct > 70:
            insights.append(f"Strong positive sentiment ({positive_pct:.1f}%) indicates high customer satisfaction")
        elif positive_pct > 50:
            insights.append(f"Moderate positive sentiment ({positive_pct:.1f}%) suggests room for improvement")
        
        if negative_pct > 30:
            insights.append(f"Significant negative feedback ({negative_pct:.1f}%) requires immediate attention")
        elif negative_pct > 15:
            insights.append(f"Notable negative feedback ({negative_pct:.1f}%) indicates areas for improvement")
        
        insights.append("Recommendation: Review detailed feedback for actionable improvements")
        
        return insights
        
        return insights

    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate insights with streaming support
        
        Args:
            input_data: Contains 'data' to analyze and 'state' for WebSocket info
            
        Returns:
            Data with insights added
        """
        start_time = time.time()
        
        try:
            self._log_input_to_file(input_data)

            data = input_data.get('data', {})
            records = data.get('records', [])
            
            # Get session info for WebSocket updates
            state = input_data.get('state', {})
            session_id = state.get('session_id')
            execution_id = state.get('execution_id')
            
            logger.info(f"Generating insights from {len(records)} records")
            
            # Send start notification
            if self.websocket_manager and session_id:
                try:
                    await self.websocket_manager.send_insight_generation_start(
                        session_id=session_id,
                        execution_id=execution_id,
                        record_count=len(records)
                    )
                except Exception as e:
                    logger.warning(f"Failed to send start notification: {e}")
            
            # Create streaming callback for progress indication
            chunk_count = [0]
            last_update = [0]
            
            async def on_thinking_chunk(chunk: str):
                """
                Show thinking progress during LLM generation
                Throttled to every 25 chunks to avoid WebSocket spam
                """
                chunk_count[0] += 1
                
                # Send thinking update every 25 chunks
                if chunk_count[0] - last_update[0] >= 25 and self.websocket_manager and session_id:
                    try:
                        await self.websocket_manager.send_insight_thinking(
                            session_id= session_id, 
                            execution_id = execution_id,
                            chunks_received = chunk_count[0]
                        )
                        last_update[0] = chunk_count[0]
                    except Exception as e:
                        logger.warning(f"Failed to send thinking notification: {e}")
            
            # Generate insights using LLM with streaming
            insights = await self._generate_insights_with_llm(
                data=data,
                on_chunk=on_thinking_chunk
            )
            
            execution_time = int((time.time() - start_time) * 1000)
            

            # Send completion notification
            if self.websocket_manager and session_id:
                try:
                    await self.websocket_manager.send_insight_generation_complete(
                        session_id = session_id,
                        execution_id = execution_id,
                        insights_count = len(insights),
                        execution_time_ms = execution_time
                    )
                except Exception as e:
                    logger.warning(f"Failed to send completion notification: {e}")
            
            logger.info(
                f"✅ Insights generated: {len(insights)} insights in {execution_time}ms"
            )
            
            results = {
                'success': True,
                'data': {
                    **data,
                    'insights': insights
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'insights_generated': len(insights),
                    'streaming_enabled': True
                }
            }
        
            self._log_results_to_file(results)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in GenerateInsightsTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': None
            }
    
class ShowResultsTool(BaseTool):
    """
    Final output tool - condenses and presents workflow results
    
    This tool MUST be the last tool in every workflow, just like LoadReviewsTool
    must be the first. It intelligently summarizes all transformations and
    analyses performed by previous tools.
    
    Features:
    - Pipeline summary (tools used in order)
    - Data transformation summary (changes at each step)
    - Key insights extraction
    - Actionable recommendations
    - Readable formatting for participants
    """
    
    def __init__(self):
        super().__init__(
            name="Show Results",
            timeout=30
        )
        self.websocket_manager = None   # Injected by orchestrator
        self.llm_client = None          # Injected by orchestrator
        
    def _create_executive_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create high-level executive summary
        
        This is the TL;DR for participants - what they need to know immediately
        """
        records = data.get('records', [])
        
        summary = {
            'total_records': len(records),
            'data_loaded': data.get('category', 'reviews'),
            'transformations_applied': self._count_transformations(data),
            'analysis_complete': bool(data.get('insights') or data.get('sentiment_summary'))
        }
        
        # Add sentiment if available
        if 'sentiment_summary' in data:
            sentiment = data['sentiment_summary']
            total = sum(sentiment.values()) or 1
            summary['sentiment_overview'] = {
                'positive_pct': round((sentiment.get('positive', 0) / total) * 100, 1),
                'neutral_pct': round((sentiment.get('neutral', 0) / total) * 100, 1),
                'negative_pct': round((sentiment.get('negative', 0) / total) * 100, 1),
                'overall_tone': self._determine_overall_tone(sentiment)
            }
        
        return summary
    
    def _create_pipeline_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Summarize the tool pipeline that was executed
        
        Shows participants what transformations their data went through
        """
        pipeline = {
            'steps_executed': [],
            'data_flow': []
        }
        
        # Track tools that were used (based on data flags/metadata)
        initial_count = data.get('total', len(data.get('records', [])))
        current_count = len(data.get('records', []))
        
        # Step 1: Data Loading (always first)
        pipeline['steps_executed'].append({
            'step': 1,
            'tool': 'Load Reviews',
            'action': f"Loaded {initial_count} reviews",
            'records_in': 0,
            'records_out': initial_count
        })
        
        step_num = 2
        
        # Detect filtering
        if 'filters_applied' in data or 'filtered_count' in data:
            filtered_count = data.get('filtered_count', current_count)
            removed = initial_count - filtered_count if initial_count > filtered_count else 0
            pipeline['steps_executed'].append({
                'step': step_num,
                'tool': 'Filter Reviews',
                'action': f"Filtered data ({removed} records removed)",
                'records_in': initial_count,
                'records_out': filtered_count
            })
            initial_count = filtered_count
            step_num += 1
        
        # Detect sorting
        if 'sorted_by' in data:
            pipeline['steps_executed'].append({
                'step': step_num,
                'tool': 'Sort Reviews',
                'action': f"Sorted by {data.get('sorted_by')} ({data.get('sort_order', 'desc')})",
                'records_in': current_count,
                'records_out': current_count
            })
            step_num += 1
        
        # Detect cleaning
        if data.get('cleaned'):
            issues_fixed = data.get('issues_removed', 0)
            pipeline['steps_executed'].append({
                'step': step_num,
                'tool': 'Clean Data' if not data.get('ai_powered') else 'AI Data Cleaner',
                'action': f"Cleaned data ({issues_fixed} issues fixed)",
                'records_in': current_count,
                'records_out': current_count
            })
            step_num += 1
        
        # Detect sentiment analysis
        if 'sentiment_summary' in data or any('sentiment' in str(r) for r in data.get('records', [])[:5]):
            pipeline['steps_executed'].append({
                'step': step_num,
                'tool': 'Sentiment Analysis',
                'action': f"Analyzed sentiment of {current_count} reviews",
                'records_in': current_count,
                'records_out': current_count
            })
            step_num += 1
        
        # Detect insights generation
        if 'insights' in data:
            insight_count = len(data.get('insights', []))
            pipeline['steps_executed'].append({
                'step': step_num,
                'tool': 'Generate Insights',
                'action': f"Generated {insight_count} insights",
                'records_in': current_count,
                'records_out': current_count
            })
            step_num += 1
        
        # Final step: Show Results (always last)
        pipeline['steps_executed'].append({
            'step': step_num,
            'tool': 'Show Results',
            'action': f"Formatted {current_count} records for output",
            'records_in': current_count,
            'records_out': current_count
        })
        
        # Create data flow summary
        pipeline['data_flow'] = {
            'initial_records': initial_count if 'total' in data else len(data.get('records', [])),
            'final_records': current_count,
            'records_removed': max(0, (initial_count if 'total' in data else current_count) - current_count),
            'transformation_count': len(pipeline['steps_executed']) - 2  # Exclude Load and Show
        }
        
        return pipeline
    
    def _create_data_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create detailed data summary
        
        Statistical overview of the final dataset
        """
        records = data.get('records', [])
        
        if not records:
            return {
                'record_count': 0,
                'message': 'No records in final dataset'
            }
        
        summary = {
            'record_count': len(records),
            'data_type': data.get('category', 'reviews'),
        }
        
        # Analyze rating distribution (if available)
        ratings = [r.get('star_rating') for r in records if r.get('star_rating')]
        if ratings:
            summary['rating_distribution'] = {
                '5_star': ratings.count(5),
                '4_star': ratings.count(4),
                '3_star': ratings.count(3),
                '2_star': ratings.count(2),
                '1_star': ratings.count(1),
                'average_rating': round(sum(ratings) / len(ratings), 2)
            }
        
        # Analyze helpful votes (if available)
        helpful_votes = [r.get('helpful_votes', 0) for r in records]
        if helpful_votes:
            summary['helpfulness'] = {
                'total_helpful_votes': sum(helpful_votes),
                'avg_helpful_votes': round(sum(helpful_votes) / len(helpful_votes), 2),
                'max_helpful_votes': max(helpful_votes)
            }
        
        # Sentiment distribution (if available)
        if 'sentiment_summary' in data:
            summary['sentiment_distribution'] = data['sentiment_summary']
        
        # Verified purchase ratio
        verified = sum(1 for r in records if r.get('verified_purchase'))
        summary['verified_purchase_ratio'] = round(verified / len(records), 2) if records else 0
        
        return summary
    
    def _extract_key_insights(self, data: Dict[str, Any]) -> List[str]:
        """
        Extract key insights from the data and previous analyses
        
        Prioritized list of the most important findings
        """
        insights = []
        records = data.get('records', [])
        
        # Add pre-generated insights if available
        if 'insights' in data:
            insights.extend(data.get('insights', []))
        
        # Generate additional insights from data patterns
        if records:
            # Rating insights
            ratings = [r.get('star_rating') for r in records if r.get('star_rating')]
            if ratings:
                avg_rating = sum(ratings) / len(ratings)
                if avg_rating >= 4.0:
                    insights.append(f"Strong customer satisfaction with average rating of {avg_rating:.2f}/5.0")
                elif avg_rating < 3.0:
                    insights.append(f"Concerning low average rating of {avg_rating:.2f}/5.0 requires attention")
            
            # Sentiment insights (if available)
            if 'sentiment_summary' in data:
                sentiment = data['sentiment_summary']
                total = sum(sentiment.values()) or 1
                negative_pct = (sentiment.get('negative', 0) / total) * 100
                
                if negative_pct > 25:
                    insights.append(f"{negative_pct:.1f}% negative sentiment - investigate common complaints")
            
            # Verification insights
            verified = sum(1 for r in records if r.get('verified_purchase'))
            verified_pct = (verified / len(records)) * 100
            if verified_pct < 50:
                insights.append(f"Only {verified_pct:.1f}% are verified purchases - authenticity concerns may exist")
        
        # If no insights generated, provide default
        if not insights:
            insights.append(f"Analyzed {len(records)} reviews - review detailed data for patterns")
        
        return insights[:5]  # Return top 5 insights
    
    def _generate_recommendations(self, data: Dict[str, Any]) -> List[str]:
        """
        Generate actionable recommendations based on results
        
        What should participants do with these insights?
        """
        recommendations = []
        records = data.get('records', [])
        
        if not records:
            return ["No data available for recommendations"]
        
        # Sentiment-based recommendations
        if 'sentiment_summary' in data:
            sentiment = data['sentiment_summary']
            total = sum(sentiment.values()) or 1
            negative_pct = (sentiment.get('negative', 0) / total) * 100
            positive_pct = (sentiment.get('positive', 0) / total) * 100
            
            if negative_pct > 30:
                recommendations.append("Priority: Analyze negative reviews to identify product/service improvements")
                recommendations.append("Implement customer service response plan for dissatisfied customers")
            
            if positive_pct > 70:
                recommendations.append("Leverage positive reviews in marketing materials")
                recommendations.append("Identify and promote features mentioned in positive feedback")
        
        # Rating-based recommendations
        ratings = [r.get('star_rating') for r in records if r.get('star_rating')]
        if ratings:
            low_ratings = [r for r in ratings if r <= 2]
            if len(low_ratings) > len(ratings) * 0.2:  # >20% low ratings
                recommendations.append("Review 1-2 star feedback for product quality issues")
        
        # Data quality recommendations
        if data.get('cleaned'):
            recommendations.append("Data cleaning was applied - verify data integrity in source systems")
        
        # Default recommendation
        if not recommendations:
            recommendations.append("Review detailed results and export data for further analysis")
            recommendations.append("Consider segmentation analysis by rating or product features")
        
        return recommendations[:5]  # Top 5 recommendations
    
    def _count_transformations(self, data: Dict[str, Any]) -> int:
        """Count how many transformation steps were applied"""
        count = 0
        
        if 'filters_applied' in data or 'filtered_count' in data:
            count += 1
        if 'sorted_by' in data:
            count += 1
        if data.get('cleaned'):
            count += 1
        if 'sentiment_summary' in data:
            count += 1
        if 'insights' in data:
            count += 1
        
        return count
    
    def _determine_overall_tone(self, sentiment_summary: Dict[str, int]) -> str:
        """Determine overall sentiment tone"""
        total = sum(sentiment_summary.values()) or 1
        positive_pct = (sentiment_summary.get('positive', 0) / total) * 100
        negative_pct = (sentiment_summary.get('negative', 0) / total) * 100
        
        if positive_pct > 60:
            return "Positive"
        elif negative_pct > 40:
            return "Negative"
        else:
            return "Mixed"
    """Format and prepare results for output"""
        
    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format and present final results from all previous tools
        
        Args:
            input_data: {
                'data': Current dataset with all transformations,
                'session_id': Session identifier (optional),
                'execution_id': Workflow execution ID (optional)
            }
            
        Returns:
            Comprehensive formatted results with:
            - Executive summary
            - Pipeline overview
            - Data summary
            - Key insights
            - Final dataset
        """
        start_time = time.time()
        
        try:
            data = input_data.get('data', {})
            
            logger.info("📊 ShowResults: Formatting final output")
            
            # Build comprehensive results
            formatted_results = {
                'executive_summary': self._create_executive_summary(data),
                'pipeline_summary': self._create_pipeline_summary(data),
                'data_summary': self._create_data_summary(data),
                'key_insights': self._extract_key_insights(data),
                'recommendations': self._generate_recommendations(data),
                'final_dataset': {
                    'records': data.get('records', []),
                    'record_count': len(data.get('records', []))
                },
                'metadata': {
                    'processed_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'workflow_complete': True,
                    'output_format': 'enhanced_v1'
                }
            }
            
            execution_time = int((time.time() - start_time) * 1000)
            
            logger.info(
                f"✅ ShowResults: Formatted {len(data.get('records', []))} "
                f"records with {len(formatted_results.get('key_insights', []))} insights "
                f"in {execution_time}ms"
            )
            
            return {
                'success': True,
                'data': formatted_results,
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'output_ready': True,
                    'is_final_output': True  # Flag this as final tool
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error in ShowResultsTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': None
            }
    
    def _create_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create summary of results"""
        records = data.get('records', [])
        
        summary = {
            'total_records': len(records),
            'has_sentiment': any('sentiment' in r for r in records),
            'has_insights': bool(data.get('insights'))
        }
        
        if 'sentiment_summary' in data:
            summary['sentiment_distribution'] = data['sentiment_summary']
        
        return summary

