# backend/app/orchestrator/tools/analysis_tools.py
import json
import math
from typing import Dict, Any, List, Optional, Literal, ClassVar, Set
import logging
import time
from collections import Counter
import asyncio

from app.orchestrator.tools.base_tool import BaseTool
from app.orchestrator.llm.tool_schemas import (
    ReviewSentimentAnalysisInputData,
    GenerateInsightsInputData
)
from app.websocket.manager import WebSocketManager

logger = logging.getLogger(__name__)

MAX_PARALLEL_CALLS:int=5
BATCH_SIZE:int=20           # Reviews per LLM call (balance between API efficiency and progress feedback)
BATCH_PADDING:float=0.25    # Tolerance for final batch (0.1 = 10%) - if remaining reviews ≤ 110% of batch_size, include all in last batch to avoid tiny batches
MAX_REVIEWS:int=100         # Hard limit - prevents excessive API costs and timeouts
RECOMMENDED_MAX:int=500     # Soft limit - warns user but allows continuation above this threshold
SAMPLE_RATE:float=0.20 #0.025# Percentage of total reviews to analyze (0.1 = 10%) - reduces cost/time while maintaining statistical validity via strategic sampling
TRUNCATE_PRODUCT:int=50
TRUNCATE_HEAD:int=100
TRUNCATE_BODY:int=400

THEMES_MAX_TOKENS:int= 6144
INSIGHT_MAX_TOKENS:int= 6144

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
    
    WEIGHT_ALPHA:float=0.5
    WEIGHT_SCALING_FACTOR:float=14

    # Keyword lists for text analysis fallback
    POSITIVE_KEYWORDS: ClassVar[Set[str]] = {
        'excellent', 'amazing', 'great', 'perfect', 'love', 'best',
        'awesome', 'fantastic', 'wonderful', 'superb', 'outstanding',
        'highly recommend', 'impressed', 'satisfied', 'quality', 'comfortable',
        'durable', 'worth', 'reliable', 'beautiful', 'nice'
    }

    NEGATIVE_KEYWORDS: ClassVar[Set[str]] = {
        'terrible', 'awful', 'horrible', 'worst', 'bad', 'poor',
        'disappointed', 'waste', 'defective', 'broken', 'cheap',
        'uncomfortable', 'overpriced', 'regret', 'useless', 'junk',
        'hate', 'never', 'avoid', 'not recommend', 'fell apart'
    }
    
    def __init__(self):
        super().__init__(
            name="Review Sentiment Analysis",
            tool_id="review-sentiment-analysis",
            descripton="Analyse reviews to extract Themes and Sentiment. Data should be clenead and filtered before starting analysis!",
            timeout=600  # 10 minutes
        )
        self.websocket_manager: Optional[WebSocketManager] = None   # Injected by orchestrator
        self.llm_client = None                                      # Injected by orchestrator
   
    def _build_llm_prompt(
        self,
        reviews_batch: List[Dict[str, Any]],
        language: Literal['en','de'] = 'en'
    ) -> tuple[str, str]:
        """
        Build optimized system and user prompts
        
        Returns:
            (system_prompt, user_prompt)
        """

        requested_lang = 'English' if language == 'en' else 'German'

        # Build review text for prompt
        reviews_text = ""
        for i, review in enumerate(reviews_batch, 1):
            product_title = review.get('product_title', '')[:TRUNCATE_PRODUCT]
            star_rating = review.get('star_rating', 'N/A')
            headline = self._strip_html(review.get('review_headline', ''))[:TRUNCATE_HEAD]
            body = self._strip_html(review.get('review_body', ''))[:TRUNCATE_BODY]
            
            reviews_text += f"""
--- Review {i} ---
Product; {product_title}
Rating: {star_rating} stars
Headline: {headline}
Body: {body}
"""
        
        # Dynamic system prompt based on theme extraction
        system_prompt =f"""REPLY IN {requested_lang}!
Role: You are a sentiment analysis specialist focused on product reviews.

Begin with a concise checklist (3–7 bullets) of what you will do; keep items conceptual, not implementation-level.
This checklist should NOT be returned!

Analyze each review and extract the main themes or product aspects the customer discusses (e.g., "sound quality", "comfort", "battery life", "durability").

## Considerations
- **Star rating**: Reference this as a supporting indicator; prioritize the review text over the rating.
- **Text sentiment**: Emphasize customers' satisfaction, praise, or complaints as expressed in the review text.
- **Context and nuance**: Recognize subtlety including sarcasm or mixed emotions.

## Extraction Guidelines
- Identify and extract 3–4 specific topics per review; if fewer than 3, extract all available topics. Do not exceed 4 topics per review.
- Do NOT extract more topics then you can actually find in a review!!
- Focus on concrete product aspects mentioned (e.g., "bass quality" over general terms like "sound").
- Find themes recurring across reviews and categorize accordingly.
- For each topic, specify:
  - Its importance to the customer (integer scale: 1 = not important at all, 7 = very important).
  - The sentiment the customer expresses toward that topic (integer scale: 1 = very negative, 7 = very positive).

## Sentiment Classification
- **Positive**: Reflects satisfaction, willingness to recommend, or clear positive feedback.
- **Negative**: Reflects dissatisfaction, complaints, or explicit warnings/cautions.

All reviews provided must be analyzed, and each must appear in the output, numbered sequentially starting from 1.
If a review contains fewer than three topics, include all available product-related topics following the required format.

## Output Format
Provide a JSON object with this exact structure:
- Keys: String numbers for each review (e.g., "1", "2", ...).
- Values: Lists containing up to four arrays, each array in order: [topic string, importance integer (1-7), sentiment integer (1-7)].
- Every input review must be present as a sequential key.
- If a review only mentions one or two topics, include only those in its value array.
- Example format:
```json
{{
  "1": [["durability", 4, 5], ["comfort", 3, 2], ["value for money", 5, 7]],
  "2": [["color", 7, 1], ["comfort", 4, 2], ["haptic", 2, 5]]
  // ...continue for all reviews
}}
```

Before returning your output:
- Do another pass and streamline wording, e.g.: 
  - "fit / sizing" and "fit / size" both become "fit /size "
  - "ease of taking off", "ease of putting on / off", "removal difficulty" all become "removal difficulty"
- Self-validate that:
  - All input reviews are represented and numbered sequentially as string keys.
  - Each review's value is an array of 1 to 4 items, each being a [topic, importance, sentiment] triple.
  - All required fields are present and structured correctly; if missing, self-correct before submitting the output.
  - You are NOT returning your initial checklist!
  - Output is in {requested_lang}!

After preparing your output, validate that the extracted topics are concrete product aspects, the scoring is internally consistent, and all output follows the exact format. If validation fails, correct errors before returning the final result.
Return ONLY the JSON array, nothing else."""
      
        user_prompt = f"""Analyze these {len(reviews_batch)} product reviews:
{reviews_text}

Return JSON with analysis for each review."""


        return system_prompt, user_prompt
    
    async def _analyze_batch_with_themes(
        self, 
        reviews_batch: List[Dict[str, Any]],
        extract_themes: bool,
        session_id: str,
        execution_id: int,
        condition: str,
        batch_num: int = 1,
        total_batches: int = 1,
        language: Literal['en','de'] = 'en',
        retry_count: int = 0,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Analyze batch of reviews for sentiment AND themes using LLM
        
        Returns:
            {
                'analyzed_reviews': List[Dict] with sentiment fields,
                'batch_themes': List[str] themes mentioned in this batch
            }
        """
                
        try:
            system_prompt, user_prompt = self._build_llm_prompt(reviews_batch=reviews_batch, language=language)

            logger.info(f"Calling LLM for batch {batch_num}/{total_batches}")

            """
            # Call LLM with streaming - LangChain based
            response = await self._call_llm(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                tool_name='review_sentiment_analysis',
                system_prompt=system_prompt,
                user_prompt=user_prompt,                
                max_tokens=20480, #8192
                verbosity='low'
            )      
            """

            response = await self._call_llm_simple_forceNoReasoning(
                user_prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=THEMES_MAX_TOKENS
            )
            
            # Map LLM results to reviews
            analyzed_reviews, themes = self._parse_sentiment_response(response, reviews_batch)

            return {
                'analyzed_reviews': analyzed_reviews,
                'batch_themes': themes
            }
        
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.warning(f"LLM batch analysis failed (attempt {retry_count + 1}/{max_retries}): {e}")
            
            # RETRY
            if retry_count < max_retries - 1:
                return await self._analyze_batch_with_themes(
                    reviews_batch=reviews_batch,
                    extract_themes=extract_themes,
                    session_id=session_id,
                    execution_id=execution_id,
                    condition=condition,
                    batch_num=batch_num,
                    total_batches=total_batches,
                    language=language,
                    retry_count=retry_count + 1,
                    max_retries=max_retries
                )
            
            # MAX RETRIES EXCEEDED - THROW ERROR
            logger.error(f"Max retries ({max_retries}) exceeded for batch {batch_num}/{total_batches}")
            return {
                'analyzed_reviews': [
                    {
                        **review,
                        'theme_analysis': {
                            'themes': [],
                            'theme_count': 0,
                            'model': self.llm_client.model,
                            'analyzed_at': time.time(),
                            'error': 'LLM analysis failed after retries'
                        }
                    }
                    for review in reviews_batch
                ],
                'batch_themes': []
            }
                
        except Exception as e:
            logger.error(f"LLM batch analysis failed: {e}", exc_info=True)            

            # Fallback: rating-based sentiment
            return {
                'analyzed_reviews': [
                    {
                        **review,
                        'theme_analysis': {
                            'themes': [],
                            'theme_count': 0,
                            'model': self.llm_client.model,
                            'analyzed_at': time.time()
                        }
                    }
                    for review in reviews_batch
                ],
                'batch_themes': []
            }
      
    def _parse_sentiment_response(
        self, 
        llm_response: Dict[str, Any], 
        reviews_batch: List[Dict[str, Any]]
    ) -> tuple[List[Dict[str, Any]], Dict[str, List[tuple]]]:
        """
        Transform LLM sentiment response into structured review data
        
        Args:
            llm_response: Raw response from chat_completion with 'content' key
            reviews_batch: Original reviews batch (for merging metadata)
        
        Returns:
            Tuple of 
            - 'analyzed_reviews': List of reviews with theme_analysis attached
            - 'themes_by_review': Dict mapping review_id to list of theme tuples
        """
        
        # Extract and parse JSON
        content = llm_response['content']
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        parsed = json.loads(content)
            
        # VALIDATE STRUCTURE
        if not isinstance(parsed, dict):
            raise ValueError(f"Expected dict, got {type(parsed)}")
        
        
        # Transform to structured format
        analyzed_reviews = []
        themes_by_review = {}  # review_id -> [(topic, importance, sentiment), ...]
        
        for review_idx_str, themes_data in parsed.items():
            # Convert string index to int (1-indexed from LLM)
            review_idx = int(review_idx_str) - 1  # Convert to 0-indexed
            
            # Get original review
            if review_idx >= len(reviews_batch):
                logger.warning(f"Review index {review_idx_str} out of range")
                continue
            
            original_review = reviews_batch[review_idx]
            review_id = original_review.get('review_id')
            
            # Parse themes as tuples
            theme_tuples = []
            for theme_data in themes_data:
                if not isinstance(theme_data, (list, tuple)) or len(theme_data) != 3:
                    raise ValueError(f"Invalid theme format: {theme_data}")
                topic, importance, sentiment_score = theme_data
                theme_tuples.append((topic, importance, sentiment_score))
            
            # Store in themes_by_review dict
            themes_by_review[review_id] = theme_tuples
            
            # Merge with original review data
            analyzed_review = {
                **original_review,  # Keep all original fields
                'theme_analysis': {
                    'themes': theme_tuples,  # Store as tuples: (topic, importance, sentiment)
                    'theme_count': len(theme_tuples),
                    'model': llm_response.get('model'),
                    'analyzed_at': time.time()
                }
            }
            
            analyzed_reviews.append(analyzed_review)
        
        return analyzed_reviews, themes_by_review
    
    def _rating_based_sentiment(self, star_rating: int) -> str:
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
        Themes are weighted by importance (1-7 scale)
        Weight formula: alpha + (importance / 14)
        """
        if theme_separation == 'by_sentiment':
            # Separate themes by sentiment
            # Track weighted scores per theme
            positive_themes = {}  # theme -> total importance score
            neutral_themes = {}
            negative_themes = {}
            positive_review_ids = {}  # theme -> set of review_ids (for count)
            neutral_review_ids = {}
            negative_review_ids = {}
            
            for review in analyzed_reviews:
                review_id = review.get('review_id')
                theme_data = review.get('theme_analysis', {})
                themes = theme_data.get('themes', [])

                seen_in_review = set()
                for theme_tuple in themes:
                    topic_str, importance, sentiment_score = theme_tuple
                    
                    # Calculate normalized weight
                    weight = self.WEIGHT_ALPHA + (importance / self.WEIGHT_SCALING_FACTOR)
                    
                    theme_lower = topic_str.lower()
                    if theme_lower not in seen_in_review:
                        seen_in_review.add(theme_lower)
                        
                        # Classify by sentiment score (1-7 scale) - using lenient positive bias
                        if sentiment_score >= 5:  # 5-7 = positive
                            if theme_lower not in positive_themes:
                                positive_themes[theme_lower] = 0
                                positive_review_ids[theme_lower] = set()
                            positive_themes[theme_lower] += weight  # ← Use calculated weight
                            positive_review_ids[theme_lower].add(review_id)
                            
                        elif sentiment_score <= 2:  # 1-2 = negative
                            if theme_lower not in negative_themes:
                                negative_themes[theme_lower] = 0
                                negative_review_ids[theme_lower] = set()
                            negative_themes[theme_lower] += weight
                            negative_review_ids[theme_lower].add(review_id)
                            
                        else:  # 3-4 = neutral
                            if theme_lower not in neutral_themes:
                                neutral_themes[theme_lower] = 0
                                neutral_review_ids[theme_lower] = set()
                            neutral_themes[theme_lower] += weight
                            neutral_review_ids[theme_lower].add(review_id)

            # Sort by weighted importance scores
            positive_counts = Counter(positive_themes)
            neutral_counts = Counter(neutral_themes)
            negative_counts = Counter(negative_themes)
            
            # Count reviews per sentiment for percentages
            total_reviews = len(analyzed_reviews)
            positive_review_count = sum(
                1 for r in analyzed_reviews 
                if any(t[2] >= 5 for t in r.get('theme_analysis', {}).get('themes', []))
            )
            neutral_review_count = sum(
                1 for r in analyzed_reviews 
                if any(t[2] == 3 or t[2] == 4 for t in r.get('theme_analysis', {}).get('themes', []))
            )
            negative_review_count = sum(
                1 for r in analyzed_reviews 
                if any(t[2] <= 2 for t in r.get('theme_analysis', {}).get('themes', []))
            )
            
            # Build result structure with weighted scores AND review counts
            result = {
                'type': 'by_sentiment',
                'positive_themes': self._format_themes_weighted(
                    positive_counts,
                    positive_review_ids,
                    max_themes_per_category, 
                    positive_review_count if positive_review_count > 0 else total_reviews, 
                    include_percentages
                ),
                'neutral_themes': self._format_themes_weighted(
                    neutral_counts,
                    neutral_review_ids,
                    max_themes_per_category, 
                    neutral_review_count if neutral_review_count > 0 else total_reviews, 
                    include_percentages
                ),
                'negative_themes': self._format_themes_weighted(
                    negative_counts,
                    negative_review_ids,
                    max_themes_per_category, 
                    negative_review_count if negative_review_count > 0 else total_reviews, 
                    include_percentages
                )
            }
        else:
            # Combined themes (all sentiments together)
            theme_scores = {}  # theme -> total weighted importance score
            theme_review_ids = {}  # theme -> set of review_ids
            
            for review in analyzed_reviews:
                review_id = review.get('review_id')
                theme_data = review.get('theme_analysis', {})
                themes = theme_data.get('themes', [])
                
                # Deduplicate within review
                seen_in_review = set()
                for theme_tuple in themes:
                    topic_str, importance, sentiment_score = theme_tuple
                    theme_lower = topic_str.lower()
                    
                    if theme_lower not in seen_in_review:
                        seen_in_review.add(theme_lower)
                        
                        # Calculate normalized weight
                        weight = self.WEIGHT_ALPHA + (importance / self.WEIGHT_SCALING_FACTOR)
                        
                        if theme_lower not in theme_scores:
                            theme_scores[theme_lower] = 0
                            theme_review_ids[theme_lower] = set()
                        theme_scores[theme_lower] += weight  # ← Use weighted score
                        theme_review_ids[theme_lower].add(review_id)
            
            # Sort by weighted scores
            theme_counts = Counter(theme_scores)
            total_reviews = len(analyzed_reviews)
            
            result = {
                'type': 'combined',
                'themes': self._format_themes_weighted(
                    theme_counts,
                    theme_review_ids,
                    max_themes_per_category, 
                    total_reviews, 
                    include_percentages
                )
            }
        
        return result

    def _format_themes_weighted(
        self, 
        weighted_theme_scores: Counter,
        review_ids_dict: Dict[str, set],
        max_count: int, 
        total_reviews: int,
        include_percentages: bool
    ) -> List[Dict[str, Any]]:
        """Format themes with weighted scores, counts, and optional percentages"""
        top_themes = weighted_theme_scores.most_common(max_count)
        
        formatted = []
        for theme, weighted_score in top_themes:
            review_count = len(review_ids_dict[theme])
            
            theme_data = {
                'theme': theme,
                'weighted_score': weighted_score,  # Sum of importance scores
                'review_count': review_count  # Number of reviews mentioning it
            }
            
            percentage = (review_count / total_reviews * 100) if total_reviews > 0 else 0
            theme_data['percentage'] = round(percentage, 2)
            
            formatted.append(theme_data)
        
        return formatted
    
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
            
            percentage = (count / total_reviews * 100) if total_reviews > 0 else 0
            theme_data['percentage'] = round(percentage, 2)
            
            formatted.append(theme_data)
        
        return formatted
    
    async def _run(self, input_data: ReviewSentimentAnalysisInputData) -> Dict[str, Any]:
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

            records = input_data.get('records', [])
            total = input_data.get('total', len(records))
            category = input_data.get('category', '')
            
            # Extract config parameters from 'config' object
            config = input_data.get('config', {})
            extract_themes = config.get('extract_themes', True)
            theme_separation = config.get('theme_separation', 'combined')
            max_themes_per_category = config.get('max_themes_per_category', 5)
            include_percentages = config.get('include_percentages', True)
            batch_size = config.get('batch_size', BATCH_SIZE)
            batch_padding = config.get('batch_padding', BATCH_PADDING)
            
            # State info
            state = input_data.get('state', {})
            session_id = state.get('session_id')
            execution_id = state.get('execution_id')
            condition = state.get('condition')
            
            if not records:
                return {
                    'success': False,
                    'error': 'No reviews provided',
                    'data': None
                }
            
            original_count = len(records)
            
            logger.info(
                f"Starting sentiment analysis: {original_count} reviews, "
                f"extract_themes={extract_themes}, theme_separation={theme_separation}"
            )

            # set overall review sentiment using star_rating (save time and cost)
            for review in records:
                review['sentiment'] = self._rating_based_sentiment(review.get('star_rating', 3))
                review['sentiment_confidence'] = 'high'
                #review['sentiment_reasoning'] = 'rating'
            
            """ Initial approach, limit to max amount to make sure cost does not run up
            
            # Cost protection: Sample if too large
            if original_count > self.MAX_REVIEWS:
                await self._send_tool_status(
                    session_id, execution_id,
                    "Large dataset - sampling",
                    5,
                    f"Sampling {self.MAX_REVIEWS} from {original_count} reviews"
                )                 
                 reviews = self._sample_reviews_multi_strategically(reviews, self.MAX_REVIEWS)
            """
            # Production approach, sample while conserving start_rating ratio (general sentiment) 
            # and above avg length (ensure quality input for sentiment analysis)            
            target_count = math.ceil(len(records) * SAMPLE_RATE)

            # Sample analysis
            try:
                reviews_sample = self._sample_reviews_multi_strategically(records, int(min(target_count, (MAX_PARALLEL_CALLS * BATCH_SIZE))))
                reviews_sample_size = len(reviews_sample)
                logger.warning(f"Sampled dataset: {original_count} → {len(reviews_sample)} reviews")

                analyzed_reviews = []
                all_themes = {}
                
                batches = self._calculate_batches(len(reviews_sample), batch_size, batch_padding)
                total_batches = len(batches)


                # Start Batch processing                
                await self._send_tool_update(
                    session_id=session_id,
                    execution_id=execution_id,
                    condition=condition,
                    message=f"{self.name} calling LLM for analysis.",
                    details={
                        'records_cnt': len(records)
                    },
                    status='LLM_handoff'
                )

                # Parallel batch processing with controlled concurrency
                max_concurrent = MAX_PARALLEL_CALLS  # Process 5 batches at once
                semaphore = asyncio.Semaphore(max_concurrent)
                
                async def process_single_batch(batch_num, start_idx, end_idx):
                    """Wrapper for parallel execution"""
                    async with semaphore:
                        batch = reviews_sample[start_idx:end_idx]
                        
                        # Analyze this batch
                        result = await self._analyze_batch_with_themes(
                            reviews_batch=batch,
                            extract_themes=extract_themes,
                            session_id=session_id,
                            execution_id=execution_id,
                            condition=condition,
                            batch_num=batch_num,
                            total_batches=total_batches,
                            language=state.get("language")
                        )
                        
                        # Send batch complete progress update
                        if self.websocket_manager and session_id:
                            try:
                                await self._send_tool_update(
                                    session_id, 
                                    execution_id,
                                    condition=state.get("condition"),
                                    progress=int(batch_num / total_batches * 100),
                                    message=f"Completed batch {batch_num}/{total_batches}",                                    
                                    details={
                                        'step': batch_num,
                                        'total_steps': total_batches
                                    },
                                    status='processing_sentiment_batch'
                                )
                            except Exception as e:
                                logger.warning(f"Failed to send progress: {e}")
                        
                        return result
                
                # Create and execute all tasks
                tasks = [
                    process_single_batch(batch_num, start_idx, end_idx)
                    for batch_num, (start_idx, end_idx) in enumerate(batches, start=1)
                ]
    
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)

                # Aggregate results
                for result in batch_results:
                    if isinstance(result, Exception):
                        logger.error(f"Batch failed: {result}")
                        continue
                    
                    analyzed_reviews.extend(result['analyzed_reviews'])
                    all_themes.update(result['batch_themes'])
                
                total_themes = sum(len(themes) for themes in all_themes.values())

                # Send batch processing completion
                if self.websocket_manager and session_id:
                    try:
                        await self._send_tool_update(
                            session_id,
                            execution_id=execution_id,
                            condition=state.get("condition"),
                            progress=75,
                            message=f"Completed analyzing {len(analyzed_reviews)} reviews!",
                            details={
                                'step_num': total_batches,
                                'total_steps':total_batches + 2,
                                'completed_batches': total_batches,
                                'themes_found': total_themes,
                                'reviews_analyzed': len(analyzed_reviews)
                            },
                            status="completed_batch_processing"
                        )
                    except Exception as e:
                        logger.warning(f"Failed to send completion: {e}")
                        
            except Exception as e:
                logger.warning(f"Failed sample analysis: {e}")

            sentiment_summary = None
            # Calculate sentiment distribution
            # Always calculate, quick and we can cache it for potential reruns with no config change!
            try:
                sentiment_counts = Counter()
                for review in records:
                    sentiment = review.get('sentiment', 'neutral')
                    sentiment_counts[sentiment] += 1
                
                # Get counts with defaults
                positive_count = sentiment_counts.get('positive', 0)
                neutral_count = sentiment_counts.get('neutral', 0)
                negative_count = sentiment_counts.get('negative', 0)
                            
                sentiment_summary = {
                    'positive': positive_count,
                    'neutral': neutral_count,
                    'negative': negative_count,
                    'total': original_count,
                    'percentages': {
                        'positive': round(positive_count / original_count * 100, 2) if original_count > 0 else 0,
                        'neutral': round(neutral_count / original_count * 100, 2) if original_count > 0 else 0,
                        'negative': round(negative_count / original_count * 100, 2) if original_count > 0 else 0
                    },
                    'dominant_sentiment': max(sentiment_counts, key=sentiment_counts.get) if sentiment_counts else 'neutral'
                }
            except Exception as e:
                logger.warning(f"Failed to calculate sentiment summary: {e}")
            
            
            # Aggregate themes if extracted            
            theme_analysis = None

            try:
                if self.websocket_manager and session_id:
                    try:
                        await self._send_tool_update(
                            session_id, 
                            execution_id=execution_id,
                            condition=state.get("condition"),
                            progress=85,
                            message="Starting theme analysis and aggregation ...",
                            details={
                                'step_num': total_batches + 1,
                                'total_steps':total_batches + 2,
                            },
                            status='start_theme_analysis'
                        )
                    except Exception as e:
                        logger.warning(f"Failed to send batch complete: {e}")

                # Start analysis of extracted themse
                theme_analysis = self._aggregate_themes(
                    analyzed_reviews,
                    theme_separation,
                    max_themes_per_category,
                    include_percentages
                )

                if self.websocket_manager and session_id:
                    try:
                        await self._send_tool_update(
                            session_id, 
                            execution_id=execution_id,
                            condition=state.get("condition"),
                            progress=95,
                            message=f"Completed theme analysis and aggregation.",
                            details={
                                'step_num': total_batches + 2,
                                'total_steps':total_batches + 2,
                                'themes_analyzed': total_themes,
                                'themes': theme_analysis
                            },
                            status='completed_theme_analysis'
                        )
                    except Exception as e:
                        logger.warning(f"Failed to send batch complete: {e}")

                logger.info(f"Extracted {len(all_themes)} total theme mentions")
            
            except Exception as e:
                logger.warning(f"Failed to aggregate themes: {e}")
            

            # Prepare column data for enrichment (maps to shared_state)
            column_data = {}
            for review in records: #analyzed_reviews:
                review_id = review['review_id']
                column_data[review_id] = {
                    'sentiment': review['sentiment'],
                    'sentiment_confidence': review['sentiment_confidence'],
                    #'sentiment_reasoning': review['sentiment_reasoning']
                }
                
                # Themes are bundled seperatly instead of with reviews, as only sample of reviews is being analyzed
                #if extract_themes:
                #    column_data[review_id]['themes'] = review.get('themes', [])
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # Send completion
            if self.websocket_manager and session_id:
                try:

                    await self._send_tool_complete(
                        session_id, 
                        execution_id=execution_id,
                        condition=state.get("condition"),
                        message=f"Analysis complete: {reviews_sample_size} reviews analyzed",
                        details={
                            'total_reviews_analyzed': reviews_sample_size,
                            'dominant_sentiment': sentiment_summary['dominant_sentiment'],
                            'themes_extracted': len(all_themes) if extract_themes else 0,
                            'execution_time_ms': execution_time
                        }
                    )
                except Exception as e:
                    logger.warning(f"Failed to send completion: {e}")
            
            logger.info(
                f"Sentiment analysis complete: "
                f"{sentiment_counts['positive']}+ {sentiment_counts['neutral']}= {sentiment_counts['negative']}- "
                f"({execution_time}ms)"
            )
            
            # Build result for shared_state mapping
            results = {
                'success': True,
                'analyzed_records': records, 
                'columns_added': ['sentiment', 'sentiment_confidence'], #+ (['themes'] if extract_themes else []),
                'column_data': column_data,             # For apply_enrichment()
                
                # Top Level availability for other tools
                'state_updates': {
                    'sentiment_statistics': sentiment_summary,
                    'theme_analysis': theme_analysis
                },

                'total': len(records),                  # Updated total
                'category': category,                   # Pass through
                'execution_time_ms': execution_time,
                'data':{                                # For results_registry -> detailed_output
                    'dominant_sentiment': sentiment_summary['dominant_sentiment'],
                    'sentiment_statistics': sentiment_summary,
                    'theme_analysis': theme_analysis,             
                },
                'summary': {                            # For results_registry -> summary
                    'tool': self.name,
                    'themes_extracted': extract_themes,
                    'reviews_analyzed': reviews_sample_size,
                    'total_themes_extracted': total_themes,
                    'batches_processed': total_batches,
                    'llm_model': self.llm_client.model
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
    
    FEATURES:
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
            tool_id="generate-insights",
            description="Generate Insights about customer reviews. For best results input should be cleaned, filtered and analysed!",
            timeout=300  # 5 minutes for LLM processing
        )
        self.websocket_manager: Optional[WebSocketManager] = None   # Injected by orchestrator
        self.llm_client = None                                      # Injected by orchestrator
    
    def _build_llm_prompt(
        self,
        focus_areas: List[str],
        max_insights: int,
        sentiment_statistics: Dict[str, Any],
        theme_analysis: Optional[Dict[str, Any]],
        sample_reviews: List[Dict[str, Any]],
        total_reviews: int,
        language: Literal['en','de'] = 'en'
    ) -> tuple[str, str]:
        """
        Build optimized system and user prompts
        
        Returns:
            (system_prompt, user_prompt)
        """

        # Map focus areas to business context
        # Single comprehensive focus area configuration
        FOCUS_AREA_CONFIG = {
        'competitive_positioning': {
            'title': 'Competitive Positioning',
            'description': 'Assess market differentiation and sources of competitive advantage',
            'examples': [
                "Same-day shipping mentioned in 28% of positive reviews—offering this for orders over $50 could capture price-sensitive segment.",
                "Competitor X lacks presence in demographic Y, which shows 35% growth—opportunity to capture increased market share."
            ]
        },
        'customer_experience': {
            'title': 'Customer Experience',
            'description': 'Evaluate user satisfaction and detect major pain points',
            'examples': [
                "Negative reviews often cite delayed shipping—improving logistics could increase retention by 10%.",
                "45% of positive feedback highlights mobile interface, correlating with 12% boost in repeat purchases."
            ]
        },
        'marketing_messages': {
            'title': 'Marketing Messaging',
            'description': 'Develop messaging strategies and clarify value propositions',
            'examples': [
                "18% of positive reviews cite sustainability—eco-messaging could increase conversion by 12-15%.",
                "'Trusted brand' reviews average 4.8★ vs. 3.2★ overall—testimonials could boost credibility and reduce hesitation."
            ]
        },
        'product_improvements': {
            'title': 'Product Improvements',
            'description': 'Recommend feature enhancements and address quality issues',
            'examples': [
                "Battery life in negative reviews—fixing this could reduce returns by 20% and improve NPS by 15 points.",
                "Size complaints drive 41% of 1-2 star reviews costing $X annually—standardizing fit could save $Y in returns."
            ]
        }
    }

        # Build focus context for prompt
        focus_context = "- " + "\n- ".join([
            f"{FOCUS_AREA_CONFIG[area]['title']}: {FOCUS_AREA_CONFIG[area]['description']}"
            for area in focus_areas
        ])

        # Build example output
        example_output = {
            area: FOCUS_AREA_CONFIG[area]['examples'][:max_insights]
            for area in focus_areas
        }
        example_json = json.dumps({"insights": example_output}, indent=2)

        # Build valid keys list
        focus_area_labels_list = "\n".join([f'- "{key}"' for key in FOCUS_AREA_CONFIG.keys()])
        focus_area_labels_line = ", ".join([f'"{key}"' for key in FOCUS_AREA_CONFIG.keys()])


        requested_lang = 'English' if language == 'en' else 'German'    

        # System prompt """
        system_prompt = f"""REPLY IN {requested_lang}!
Role: You are a senior business analyst specializing in e-commerce product strategy and market intelligence.

# Core Competencies
- Derive strategic insights from customer feedback trends and sentiment data.
- Uncover market opportunities, competitive gaps, and positioning strategies.
- Synthesize data-driven findings into actionable business intelligence.
- Provide insights that are specific, measurable, and clearly linked to business outcomes.

# Analytical Approach
- Begin each analysis with an internal checklist of 3–7 high-level, strategic concepts to guide your extraction of insights. This checklist is for internal use only and should not appear in your output.
- After generating insights and before submission, validate the results: verify format, count, and quantitative evidence, then self-correct any deficiencies.

# Analysis Focus Areas:
{focus_context}

# Task
Analyze the provided data and generate exactly {max_insights} strategic business insights per focus area. For each insight:
1. Identify a data-driven pattern or opportunity (avoid mere action items).
2. Quantify business impact using specific metrics or data points—use precise numbers and appropriate labels (e.g., %, $, number of reviews, NPS points) wherever possible.
3. Link customer sentiment to potential business outcomes (e.g., "X% negative sentiment on theme Y correlates with Z business risk").
4. Prioritize insights from highest to lowest business impact; if ranking is uncertain, order based on available evidence or logical estimation.

Before significant decisions or pivots in approach, briefly state your rationale and the minimal inputs required for the next step. For each major milestone (after insights generation and after final validation), provide a concise internal micro-update: state what has been completed and what will follow (these micro-updates are for reasoning only and should not appear in final output).

# What Constitutes a Strong Insight
- Avoid task-oriented statements (e.g., "Implement one-click checkout").
- Deliver insight-driven findings linked to measurable impact (e.g., "Cart abandonment data shows 23% drop-off at payment—one-click checkout could recover $X in revenue").

Examples:
- Weak: "Add live chat support."
- Strong: "Negative reviews cite response delays—real-time support could improve satisfaction scores by 15-20 points."

# Output Constraints
- The output must be valid JSON using a single parent key: "insights".
- The value is an object where each key corresponds to a focus area label ({focus_area_labels_line}), and each value is a list of exactly {max_insights} insight statements (strings), ordered from highest to lowest impact.
- If insufficient data prevents identifying {max_insights} insights in a focus area, fill the remainder with: "Insufficient data for meaningful insight".
- If a focus area label is missing or empty in the input, return an empty array for that label.
- Output must be generate in {requested_lang}!

# Example JSON Structure
```json
{example_json}
```
# Validation Checklist
- Each specified focus area key appears with exactly {max_insights} items.
- Each insight contains explicit metrics or quantitative evidence (e.g., %, $, NPS points, review counts).
- Output strictly conforms to the example JSON format shown above.
- All required constraints are met and the response is only the validated JSON object—no extra commentary.
- All outputs are generate in {requested_lang}!

# Output Format
- Structure: Valid JSON
- Parent key: "insights" (object)
- Each focus area label (string): {focus_area_labels_line}
- Value: Array of {max_insights} strings (each a strategic, insight-ordered statement)
- If a focus area has fewer than {max_insights} valid insights, fill remaining slots with: "Insufficient data for meaningful insight"
- If a focus area label is missing or empty, return an empty array for that label
- All insight statements are strings, ordered from highest to lowest business impact based on analysis or best estimation

Return ONLY the JSON array, nothing else.
"""

        # Build statistics summary
        sentiment_summary = ""
        if sentiment_statistics:
            positive_pct = sentiment_statistics.get('percentages', {}).get('positive', 0)
            neutral_pct = sentiment_statistics.get('percentages', {}).get('neutral', 0)
            negative_pct = sentiment_statistics.get('percentages', {}).get('negative', 0)
            sentiment_summary = f'- Sentiment Distribution: {positive_pct:.1f}% positive, {neutral_pct:.1f}% neutral, {negative_pct:.1f}% negative'

        # Build theme summary if available
        theme_summary = ""
        if theme_analysis:
            if theme_analysis.get('type') == 'by_sentiment':
                pos_themes = theme_analysis.get('positive_themes', [])
                neu_themes = theme_analysis.get('neutral_themes', [])
                neg_themes = theme_analysis.get('negative_themes', [])
                
                if pos_themes:
                    theme_summary += f"\n**Top Positive Themes:**\n"
                    for t in pos_themes:
                        theme_summary += f"- {t['theme']}: ({t.get('percentage', 0):.1f}%)\n"

                if neu_themes:
                    theme_summary += f"\n**Top Neutral Themes:**\n"
                    for t in neu_themes:
                        theme_summary += f"- {t['theme']}: ({t.get('percentage', 0):.1f}%)\n"
                
                if neg_themes:
                    theme_summary += f"\n**Top Negative Themes:**\n"
                    for t in neg_themes:
                        theme_summary += f"- {t['theme']}: ({t.get('percentage', 0):.1f}%)\n"
            else:
                top_themes = theme_analysis.get('themes', [])
                if top_themes:
                    theme_summary += f"\n**Top Themes:**\n"
                    for t in top_themes:
                        theme_summary += f"- {t['theme']}: ({t.get('percentage', 0):.1f}%)\n"
        
        # Build sample review context
        review_context = ""
        if sample_reviews:
            review_context = f"\n**Sample Reviews for Context:**\n"
            for i, review in enumerate(sample_reviews[:10], 1):  # Max 10 examples
                rating = review.get('star_rating', 'N/A')
                body = review.get('review_body', '')[:200]  # Truncate
                review_context += f"{i}. [{rating}★] {body}...\n"
        
        # User prompt
        user_prompt = f"""Analyze the provided data and generate exactly {max_insights} **strategic business insights** per focus area.

**Focus Areas:** 
{focus_area_labels_list}
{sentiment_summary}

**Dataset Overview:**
- Total Reviews: {total_reviews}
{theme_summary}
{review_context}

**Guidelines:**
1. Be specific and data-driven (reference themes)
2. Prioritize based on business impact and data severity
3. Generate exactly {max_insights} insights per focus area

Generate insights now."""

        return system_prompt, user_prompt

    async def _generate_insights_with_llm(
        self,
        focus_areas: List[str],
        max_insights: int,
        sentiment_statistics: Dict[str, Any],
        theme_analysis: Dict[str, Any] | None,
        reviews: List[Dict[str, Any]],
        total_reviews: int,
        session_id: str | None = None,
        execution_id: int | None = None,
        condition: str | None = None,
        language: Literal['en','de'] = 'en',
        retry_count: int = 0,
        max_retries: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Generate insights using streaming LLM
        
        Returns:
            List of recommendation dicts
        """
        
        # Sample reviews for context
        target_count = math.ceil(len(reviews) * SAMPLE_RATE)
        sample_reviews = self._sample_reviews_multi_strategically(reviews, int(min(target_count, MAX_REVIEWS)))

        # Build prompts
        system_prompt, user_prompt = self._build_llm_prompt(
            focus_areas=focus_areas,
            max_insights=max_insights,
            sentiment_statistics=sentiment_statistics,
            theme_analysis=theme_analysis,
            sample_reviews=sample_reviews,
            total_reviews=total_reviews,
            language=language
        )
        
        #logger.info(f"system_prompt: {system_prompt}")
        #logger.info(f"user_prompt: {user_prompt}")

        logger.debug(f"Calling LLM for {len(focus_areas)} focus areas")
        
        try:
            """
            # Call LLM with streaming - LangChain based
            response = await self._call_llm(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                tool_name='generate_insights',
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=20480, #8192
                verbosity='low'
            )
            """

            response = await self._call_llm_simple_forceNoReasoning(
                user_prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=INSIGHT_MAX_TOKENS
            )

            # Parse JSON response
            content = response.get('content', '')
            
            # Extract JSON
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()
            
            parsed = json.loads(content)
            insights = parsed.get('insights', [])

            if not isinstance(insights, dict):
                raise ValueError(f"Expected dict, got {type(insights)}")
            
            if not insights:
                logger.warning("LLM returned empty insights")
                return self._generate_fallback_insights(
                    focus_areas, max_insights, sentiment_statistics
                )
            
            return insights
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"LLM returned invalid response (attempt {retry_count + 1}/{max_retries}): {e}")
            
            # RETRY
            if retry_count < max_retries:
                return await self._generate_insights_with_llm(
                    focus_areas=focus_areas,
                    max_insights=max_insights,
                    sentiment_statistics=sentiment_statistics,
                    theme_analysis=theme_analysis,
                    reviews=reviews,
                    total_reviews=total_reviews,
                    session_id=session_id,
                    execution_id=execution_id,
                    condition=condition,
                    language=language,
                    retry_count=retry_count + 1,
                    max_retries=max_retries
                )
            
            # MAX RETRIES EXCEEDED - THROW ERROR
            logger.error(f"Max retries ({max_retries}) exceeded for insight generation")
            raise RuntimeError(f"Failed to generate valid insights after {max_retries} attempts: {e}")

        except Exception as e:
            logger.error(f"LLM insight generation failed: {e}", exc_info=True)
            return self._generate_fallback_insights(
                focus_areas, max_insights, sentiment_statistics
            )
    
    def _generate_fallback_insights(
        self,
        focus_areas: List[str],
        max_insights: int,
        sentiment_statistics: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate basic fallback insights"""
        
        insights = []
        positive_pct = sentiment_statistics.get('percentages', {}).get('positive', 0)
        negative_pct = sentiment_statistics.get('percentages', {}).get('negative', 0)
        
        for area in focus_areas:
            if area == 'customer_experience':
                if negative_pct > 30:
                    insights.append({
                        'focus_area': area,
                        'title': 'Address high negative sentiment',
                        'description': f'{negative_pct:.1f}% of reviews are negative, indicating significant customer dissatisfaction',
                        'expected_impact': 'Improve customer satisfaction scores',
                        'priority': 'high'
                    })
            
            elif area == 'product_improvements':
                insights.append({
                    'focus_area': area,
                    'title': 'Analyze negative feedback themes',
                    'description': 'Review detailed feedback to identify recurring product issues',
                    'expected_impact': 'Reduce product returns and complaints',
                    'priority': 'medium'
                })
        
        return insights[:max_insights * len(focus_areas)]

    async def _run(self, input_data: GenerateInsightsInputData) -> Dict[str, Any]:
        """
        Generate insights with streaming support
        
        Args:
            input_data: {
                'records': List[Dict] - Reviews (will be sampled),
                'config': {
                    'focus_area': List[str] - Focus areas,
                    'max_insights': int - insights per area
                },
                'data': {
                    'tool_results': {
                        'sentiment_statistics': {...},
                        'theme_analysis': {...}
                    }
                },
                'state': {
                    'session_id': str,
                    'execution_id': int
                }
            }
        
        Returns:
            {
                'success': bool,
                'data': {
                    'tool_results': {
                        'insights': {...}
                    }
                }
            }
        """
        start_time = time.time()
        
        try:
            self._log_input_to_file(input_data)
            
            # Extract parameters
            config = input_data.get('config', {})
            focus_areas = config.get('focus_area', ['customer_experience'])
            max_insights = config.get('max_insights', 3)
            

            # Extract data
            records = input_data.get('records', [])
            sentiment_statistics = input_data.get('sentiment_statistics', {})
            theme_analysis = input_data.get('theme_analysis')

            # State info
            state = input_data.get('state', {})
            session_id = state.get('session_id')
            execution_id = state.get('execution_id')
            condition = state.get('condition')
            
            total_reviews = input_data.get('total', len(records))
            category = input_data.get('category')
            
            logger.info(
                f"Generating insights: {len(focus_areas)} focus areas, "
                f"{max_insights} insights each, "
                f"{total_reviews} total reviews"
            )
            
            # Send start notification
            if self.websocket_manager and session_id:
                try:                    
                    await self._send_tool_update(
                        session_id=session_id,
                        execution_id=execution_id,
                        condition=condition,
                        message=f"{self.name} calling LLM for analysis.",
                        details={
                            'records_cnt': total_reviews
                        },
                        status='LLM_handoff'
                    )
                except Exception as e:
                    logger.warning(f"Failed to send start: {e}")
            
            # Generate insights
            insights = await self._generate_insights_with_llm(
                focus_areas=focus_areas,
                max_insights=max_insights,
                sentiment_statistics=sentiment_statistics,
                theme_analysis=theme_analysis,
                reviews=records,
                total_reviews=total_reviews,
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                language=state.get("language")
            )
            
            # Valid only (excluding insufficient data)            
            # Count total insights across all categories
            total_insights = sum(
                sum(1 for insight in insights if "Insufficient data" not in insight)
                for insights in insights.values()
            )

            # By category, excluding "Insufficient data"
            counts = {
                category: sum(1 for insight in insights if "Insufficient data" not in insight)
                for category, insights in insights.items()
            }

            print(f"Total insights: {total_insights}")
            print(f"By category: {counts}")

            # Send completion
            if self.websocket_manager and session_id:
                try:
                    await self._send_tool_complete(
                        session_id, 
                        execution_id=execution_id,
                        condition=state.get("condition"),
                        message=f"Generated {total_insights} insights",
                        details={
                            'insights_count': total_insights,                            
                            'focus_areas': focus_areas,
                            'insights_by_focus': counts
                        }
                    )
                except Exception as e:
                    logger.warning(f"Failed to send completion: {e}")
            
            execution_time = int((time.time() - start_time) * 1000)

            logger.info(
                f"Insights generated: {len(insights)} insights "
                f"in {execution_time}ms"
            )
            
            # Build result
            results = {
                'success': True,
                'analyzed_records': records, 

                # Top Level availability for other tools
                'state_updates': {
                    'insights': insights
                },

                'total': len(records),                  # Updated total
                'category': category,                   # Pass through
                'execution_time_ms': execution_time,
                'data':{                                # For results_registry -> detailed_output
                    'insights': insights
                },
                'summary': {                            # For results_registry -> summary
                    'tool': self.name,
                    'total_insights': total_insights,
                    'focus_areas': focus_areas,
                    'insights_by_focus': counts,
                    'llm_model': self.llm_client.model
                }
            }
            
            self._log_results_to_file(results)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in GenerateInsightsTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': None,
                'execution_time_ms': int((time.time() - start_time) * 1000)
            }