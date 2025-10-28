# backend/app/orchestrator/tools/analysis_tools.py
from typing import Dict, Any, List, Optional, Callable
import logging
import time
from collections import Counter

from app.orchestrator.tools.base_tool import BaseTool

# Import the LLM client from existing infrastructure
from app.orchestrator.llm.client import llm_client

logger = logging.getLogger(__name__)


class ReviewSentimentAnalysisTool(BaseTool):
    """
    LLM-Powered Sentiment Analysis of Product Reviews with Streaming Progress
    
    Features:
    - Batch processing for efficiency (10 reviews per API call)
    - Structured JSON outputs for reliability
    - Real-time batch progress updates via WebSocket
    - "Thinking" indicators during LLM processing
    - Context-aware analysis (understands nuance, sarcasm)
    - Combined rating + text analysis
    - Confidence scoring and reasoning
    - Automatic fallback if LLM fails
    
    Sentiment categories:
    - Positive: Customer satisfaction evident
    - Neutral: Mixed or moderate feedback  
    - Negative: Customer dissatisfaction
    """
    
    # Batch size for LLM calls (balance between cost and speed)
    BATCH_SIZE = 10

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
        self.name = "Review Sentiment Analysis"
        self.llm_client = llm_client  # Use the global LLM client
        self.websocket_manager = None  # Injected by orchestrator
    
    def set_websocket_manager(self, ws_manager):
        """
        Set WebSocket manager for real-time progress updates
        Called by orchestrator during initialization
        """
        self.websocket_manager = ws_manager
        logger.info("WebSocket manager injected into ReviewSentimentAnalysisTool")
    
    async def _analyze_batch_with_llm(
        self, 
        reviews_batch: List[Dict[str, Any]],
        session_id: Optional[str] = None,
        execution_id: Optional[int] = None,
        batch_num: int = 1,
        total_batches: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Analyze a batch of reviews using the LLM client with progress updates
        
        Args:
            reviews_batch: List of up to 10 reviews to analyze
            session_id: Session ID for WebSocket updates
            execution_id: Execution ID for tracking
            batch_num: Current batch number (1-indexed)
            total_batches: Total number of batches
            
        Returns:
            List of analyzed reviews with sentiment fields added
        """
        # Build prompt with review data
        reviews_text = ""
        for i, review in enumerate(reviews_batch, 1):
            star_rating = review.get('star_rating', 'N/A')
            headline = review.get('review_headline', '')[:100]  # Truncate
            body = review.get('review_body', '')[:300]  # Truncate to save tokens
            
            reviews_text += f"""
--- Review {i} ---
Rating: {star_rating} stars
Headline: {headline}
Body: {body}
"""
        
        system_prompt = """You are a sentiment analysis expert for e-commerce product reviews.
Analyze each review and classify its sentiment as 'positive', 'neutral', or 'negative'.

Consider:
- Star rating (but don't rely on it exclusively - read the text)
- Text sentiment (satisfaction, praise, complaints, warnings)
- Context and nuance (sarcasm, mixed feelings, moderate feedback)

Classification guidelines:
- Positive: Customer is satisfied, would recommend, praises product
- Neutral: Mixed feelings, moderate feedback, factual without strong opinion
- Negative: Dissatisfied, complaints, warnings, would not recommend

Return a JSON object with this EXACT structure:
{
  "reviews": [
    {
      "review_number": 1,
      "sentiment": "positive",
      "confidence": "high",
      "reasoning": "Customer highly satisfied with product quality"
    }
  ]
}

IMPORTANT: Include ALL reviews in your response, numbering them 1, 2, 3, etc."""
        
        user_prompt = f"""Analyze the sentiment of these {len(reviews_batch)} product reviews:
{reviews_text}

Return JSON with sentiment analysis for each review."""
        
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
                logger.warning(f"Failed to send batch start notification: {e}")
        
        # Streaming callback for activity indication
        chunk_count = [0]  # Use list to allow modification in nested function
        last_update = [0]  # Track last update to avoid spam
        
        async def on_thinking_chunk(chunk: str):
            """Callback for each streaming chunk - shows 'thinking' activity"""
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
                    logger.warning(f"Failed to send thinking notification: {e}")
        
        try:
            logger.info(f"Calling LLM for sentiment analysis batch {batch_num}/{total_batches}")
            
            # Use streaming for progress indication (but keep JSON parsing)
            response = await self.llm_client.get_structured_decision(
                prompt=user_prompt,
                system_prompt=system_prompt,
                expected_fields=['reviews'],
                stream=True,  # Enable streaming for progress
                on_chunk=on_thinking_chunk  # Progress callback
            )
            
            # Map LLM results back to reviews
            analyzed_reviews = []
            llm_results = response.get('reviews', [])
            
            logger.info(f"LLM returned analysis for {len(llm_results)} reviews")
            
            for i, review in enumerate(reviews_batch):
                # Find matching LLM result by review_number
                llm_result = None
                for result in llm_results:
                    if result.get('review_number') == i + 1:
                        llm_result = result
                        break
                
                if not llm_result and i < len(llm_results):
                    # Fallback: use position if review_number doesn't match
                    llm_result = llm_results[i]
                
                # Build analyzed review with LLM results
                if llm_result:
                    analyzed_review = {
                        **review,  # Keep all original fields
                        'sentiment': llm_result.get('sentiment', 'neutral'),
                        'confidence': llm_result.get('confidence', 'medium'),
                        'sentiment_reasoning': llm_result.get('reasoning', 'No reasoning provided')
                    }
                else:
                    # No LLM result for this review - use fallback
                    analyzed_review = {
                        **review,
                        'sentiment': self._fallback_sentiment(review.get('star_rating', 3)),
                        'confidence': 'low',
                        'sentiment_reasoning': 'LLM analysis missing, used rating fallback'
                    }
                
                analyzed_reviews.append(analyzed_review)
            
            # Send batch complete notification
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
                    logger.warning(f"Failed to send batch complete notification: {e}")
            
            return analyzed_reviews
            
        except Exception as e:
            logger.error(f"LLM sentiment analysis failed for batch {batch_num}: {e}", exc_info=True)
            
            # Send error notification
            if self.websocket_manager and session_id:
                try:
                    await self.websocket_manager.send_to_session(session_id, {
                        'type': 'sentiment_batch_error',
                        'execution_id': execution_id,
                        'batch_number': batch_num,
                        'error': str(e)
                    })
                except Exception as ws_error:
                    logger.warning(f"Failed to send error notification: {ws_error}")
            
            # Fallback: simple rating-based sentiment for all reviews
            return [
                {
                    **review,
                    'sentiment': self._fallback_sentiment(review.get('star_rating', 3)),
                    'confidence': 'low',
                    'sentiment_reasoning': f'LLM failed ({type(e).__name__}), used rating fallback'
                }
                for review in reviews_batch
            ]
    
    def _fallback_sentiment(self, star_rating: int) -> str:
        """
        Fallback sentiment classification based on star rating only
        Used when LLM analysis fails
        """
        if star_rating >= 4:
            return 'positive'
        elif star_rating == 3:
            return 'neutral'
        else:
            return 'negative'
    
    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze sentiment of reviews using OpenAI with real-time progress updates
        
        Args:
            input_data: {
                'data': {
                    'records': List[Dict] - Reviews to analyze (from LoadReviewsTool)
                        Each review should have: star_rating, review_body, review_headline
                },
                'aggregate_by_product': bool (optional) - Group by product_id,
                'state': Dict (optional) - Workflow state with session_id and execution_id
            }
            
        Returns:
            Dictionary with:
            - success: bool
            - data: {
                'records': List[Dict] with sentiment added to each review,
                'overall_sentiment': Dict with counts and percentages,
                'product_aggregates': Dict (if aggregate_by_product=True),
                'statistics': Dict with detailed stats
              }
            - execution_time_ms: int
            - metadata: Dict
        """
        start_time = time.time()
        
        try:
            # Support both direct 'reviews' and nested 'data.records' structure
            data = input_data.get('data', {})
            reviews = data.get('records', input_data.get('reviews', []))
            
            if not reviews:
                return {
                    'success': False,
                    'error': 'No reviews provided for analysis',
                    'data': None
                }
            
            aggregate_by_product = input_data.get('aggregate_by_product', False)
            
            # Get session info for WebSocket updates
            state = input_data.get('state', {})
            session_id = state.get('session_id')
            execution_id = state.get('execution_id')
            
            logger.info(f"Starting LLM sentiment analysis for {len(reviews)} reviews")
            
            # Process reviews in batches
            analyzed_reviews = []
            total_batches = (len(reviews) + self.BATCH_SIZE - 1) // self.BATCH_SIZE
            
            # Send overall start notification
            if self.websocket_manager and session_id:
                try:
                    await self.websocket_manager.send_to_session(session_id, {
                        'type': 'sentiment_analysis_start',
                        'execution_id': execution_id,
                        'total_reviews': len(reviews),
                        'total_batches': total_batches,
                        'batch_size': self.BATCH_SIZE
                    })
                except Exception as e:
                    logger.warning(f"Failed to send analysis start notification: {e}")
            
            for batch_idx in range(0, len(reviews), self.BATCH_SIZE):
                batch = reviews[batch_idx:batch_idx + self.BATCH_SIZE]
                batch_num = (batch_idx // self.BATCH_SIZE) + 1
                
                logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} reviews)")
                
                # Analyze this batch with progress updates
                batch_results = await self._analyze_batch_with_llm(
                    reviews_batch=batch,
                    session_id=session_id,
                    execution_id=execution_id,
                    batch_num=batch_num,
                    total_batches=total_batches
                )
                analyzed_reviews.extend(batch_results)
                
                # Small delay between batches to avoid rate limits
                if batch_idx + self.BATCH_SIZE < len(reviews):
                    await asyncio.sleep(0.1)
            
            # Calculate overall statistics
            sentiment_counts = Counter()
            product_sentiments = {}
            
            for review in analyzed_reviews:
                sentiment = review.get('sentiment', 'neutral')
                product_id = review.get('product_id', 'unknown')
                
                # Update counts
                sentiment_counts[sentiment] += 1
                
                # Aggregate by product if requested
                if aggregate_by_product:
                    if product_id not in product_sentiments:
                        product_sentiments[product_id] = Counter()
                    product_sentiments[product_id][sentiment] += 1
            
            # Calculate percentages
            total_reviews = len(analyzed_reviews)
            overall_sentiment = {
                'positive': {
                    'count': sentiment_counts['positive'],
                    'percentage': round(sentiment_counts['positive'] / total_reviews * 100, 2)
                },
                'neutral': {
                    'count': sentiment_counts['neutral'],
                    'percentage': round(sentiment_counts['neutral'] / total_reviews * 100, 2)
                },
                'negative': {
                    'count': sentiment_counts['negative'],
                    'percentage': round(sentiment_counts['negative'] / total_reviews * 100, 2)
                }
            }
            
            # Determine dominant sentiment
            dominant_sentiment = max(sentiment_counts, key=sentiment_counts.get)
            
            # Calculate average star rating
            avg_rating = sum(r.get('star_rating', 3) for r in analyzed_reviews) / total_reviews
            
            # Build result data
            result_data = {
                **data,  # Preserve original data structure
                'records': analyzed_reviews,  # Replace records with analyzed versions
                'overall_sentiment': overall_sentiment,
                'dominant_sentiment': dominant_sentiment,
                'statistics': {
                    'total_reviews': total_reviews,
                    'average_rating': round(avg_rating, 2),
                    'sentiment_distribution': dict(sentiment_counts),
                    'confidence_breakdown': {
                        'high': sum(1 for r in analyzed_reviews if r.get('confidence') == 'high'),
                        'medium': sum(1 for r in analyzed_reviews if r.get('confidence') == 'medium'),
                        'low': sum(1 for r in analyzed_reviews if r.get('confidence') == 'low')
                    },
                    'batches_processed': total_batches,
                    'llm_model': self.llm_client.model
                }
            }
            
            # Add product aggregates if requested
            if aggregate_by_product:
                product_summary = {}
                for product_id, sentiments in product_sentiments.items():
                    total = sum(sentiments.values())
                    product_summary[product_id] = {
                        'total_reviews': total,
                        'positive': sentiments['positive'],
                        'neutral': sentiments['neutral'],
                        'negative': sentiments['negative'],
                        'dominant_sentiment': max(sentiments, key=sentiments.get),
                        'positive_percentage': round(sentiments['positive'] / total * 100, 2) if total > 0 else 0
                    }
                result_data['product_aggregates'] = product_summary
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # Send completion notification
            if self.websocket_manager and session_id:
                try:
                    await self.websocket_manager.send_to_session(session_id, {
                        'type': 'sentiment_analysis_complete',
                        'execution_id': execution_id,
                        'total_reviews_analyzed': total_reviews,
                        'dominant_sentiment': dominant_sentiment,
                        'execution_time_ms': execution_time
                    })
                except Exception as e:
                    logger.warning(f"Failed to send completion notification: {e}")
            
            logger.info(
                f"LLM sentiment analysis complete: "
                f"{sentiment_counts['positive']} positive, "
                f"{sentiment_counts['neutral']} neutral, "
                f"{sentiment_counts['negative']} negative "
                f"({execution_time}ms)"
            )
            
            return {
                'success': True,
                'data': result_data,
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'reviews_analyzed': total_reviews,
                    'dominant_sentiment': dominant_sentiment,
                    'average_rating': round(avg_rating, 2),
                    'batches_processed': total_batches,
                    'llm_model': self.llm_client.model
                }
            }
            
        except Exception as e:
            logger.error(f"Error in ReviewSentimentAnalysisTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': None,
                'execution_time_ms': int((time.time() - start_time) * 1000)
            }


class SentimentAnalysisTool(BaseTool):
    """Analyze sentiment of text data"""
    
    def __init__(self):
        self.name = "Sentiment Analysis"
    
    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze sentiment of text records
        
        Args:
            input_data: Contains 'data' with text records
            
        Returns:
            Data with sentiment scores
        """
        start_time = time.time()
        
        try:
            data = input_data.get('data', {})
            records = data.get('records', [])
            
            logger.info(f"Analyzing sentiment for {len(records)} records")
            
            # Simulate sentiment analysis
            # In real implementation: use OpenAI, HuggingFace, or other NLP models
            analyzed_records = []
            sentiment_summary = {'positive': 0, 'neutral': 0, 'negative': 0}
            
            for record in records:
                text = record.get('text', '')
                
                # Simple mock sentiment (in real: call ML model)
                # Based on text length as proxy
                value = record.get('value', 50)
                if value > 60:
                    sentiment = 'positive'
                    score = 0.8
                elif value < 40:
                    sentiment = 'negative'
                    score = 0.7
                else:
                    sentiment = 'neutral'
                    score = 0.5
                
                sentiment_summary[sentiment] += 1
                
                analyzed_records.append({
                    **record,
                    'sentiment': sentiment,
                    'sentiment_score': score
                })
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'data': {
                    **data,
                    'records': analyzed_records,
                    'sentiment_summary': sentiment_summary
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'records_analyzed': len(analyzed_records)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in SentimentAnalysisTool: {e}")
            return {
                'success': False,
                'error': str(e),
                'data': None
            }


class GenerateInsightsTool(BaseTool):
    """
    Generate insights from analyzed data using LLM with STREAMING SUPPORT
    
    ✅ NEW FEATURES:
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
        self.name = "Generate Insights"
        self.llm_client = llm_client
        self.websocket_manager = None
    
    def set_websocket_manager(self, ws_manager):
        """
        Set WebSocket manager for real-time updates
        Called by orchestrator during initialization
        """
        self.websocket_manager = ws_manager
        logger.info("✅ WebSocket manager injected into GenerateInsightsTool")
    
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
            
            return {
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
            
        except Exception as e:
            logger.error(f"Error in GenerateInsightsTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': None
            }
    
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
        
        # Build rich prompt
        prompt = f"""Analyze this product review data and generate 3-5 actionable business insights:

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
        self.name = "Show Results"
    
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
    
    def __init__(self):
        self.name = "Show Results"
    
    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format results for presentation
        
        Args:
            input_data: Contains all processed data
            
        Returns:
            Formatted results
        """
        start_time = time.time()
        
        try:
            data = input_data.get('data', {})
            
            logger.info("Formatting results for output")
            
            # Format results
            formatted_results = {
                'summary': self._create_summary(data),
                'data': data.get('records', []),
                'insights': data.get('insights', []),
                'metadata': {
                    'total_records': len(data.get('records', [])),
                    'processed_at': time.strftime('%Y-%m-%d %H:%M:%S')
                }
            }
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'data': formatted_results,
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'output_ready': True
                }
            }
            
        except Exception as e:
            logger.error(f"Error in ShowResultsTool: {e}")
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