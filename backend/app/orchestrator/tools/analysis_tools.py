# backend/app/orchestrator/tools/analysis_tools.py
from typing import Dict, Any, List
import logging
import time
from app.config import settings
from collections import Counter
import asyncio
import re

# Import the LLM client from existing infrastructure
from app.orchestrator.llm.client import llm_client

logger = logging.getLogger(__name__)


class ReviewSentimentAnalysisTool:
    """
    LLM-Powered Sentiment Analysis of Product Reviews
    
    Leverages OpenAI via the existing LLM client to analyze review sentiment with:
    - Batch processing for efficiency (10 reviews per API call)
    - Structured JSON outputs for reliability
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

     # Keyword lists for text analysis
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
    
    async def _analyze_batch_with_llm(
        self, 
        reviews_batch: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Analyze a batch of reviews using the LLM client
        
        Args:
            reviews_batch: List of up to 10 reviews to analyze
            
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
        
        try:
            logger.info(f"Calling LLM for sentiment analysis of {len(reviews_batch)} reviews")
            
            # Use existing LLM client with structured output
            response = await self.llm_client.get_structured_decision(
                prompt=user_prompt,
                system_prompt=system_prompt,
                expected_fields=['reviews']
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
            
            return analyzed_reviews
            
        except Exception as e:
            logger.error(f"LLM sentiment analysis failed for batch: {e}", exc_info=True)
            
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
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze sentiment of reviews using OpenAI
        
        Args:
            input_data: {
                'data': {
                    'records': List[Dict] - Reviews to analyze (from LoadReviewsTool)
                        Each review should have: star_rating, review_body, review_headline
                },
                'aggregate_by_product': bool (optional) - Group by product_id
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
            
            logger.info(f"Starting LLM sentiment analysis for {len(reviews)} reviews")
            
            # Process reviews in batches
            analyzed_reviews = []
            total_batches = (len(reviews) + self.BATCH_SIZE - 1) // self.BATCH_SIZE
            
            for batch_idx in range(0, len(reviews), self.BATCH_SIZE):
                batch = reviews[batch_idx:batch_idx + self.BATCH_SIZE]
                batch_num = (batch_idx // self.BATCH_SIZE) + 1
                
                logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} reviews)")
                
                # Analyze this batch with LLM
                batch_results = await self._analyze_batch_with_llm(batch)
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

class SentimentAnalysisTool:
    """Analyze sentiment of text data"""
    
    def __init__(self):
        self.name = "Sentiment Analysis"
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
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


class GenerateInsightsTool:
    """Generate insights from analyzed data using LLM"""
    
    def __init__(self):
        self.name = "Generate Insights"
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate insights from data
        
        Args:
            input_data: Contains 'data' to analyze
            
        Returns:
            Data with insights
        """
        start_time = time.time()
        
        try:
            data = input_data.get('data', {})
            records = data.get('records', [])
            
            logger.info(f"Generating insights from {len(records)} records")
            
            # Simulate insight generation
            # In real implementation: call OpenAI GPT to generate insights
            insights = self._generate_mock_insights(data)
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'data': {
                    **data,
                    'insights': insights
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'insights_generated': len(insights)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in GenerateInsightsTool: {e}")
            return {
                'success': False,
                'error': str(e),
                'data': None
            }
    
    def _generate_mock_insights(self, data: Dict[str, Any]) -> List[str]:
        """Generate mock insights based on data"""
        records = data.get('records', [])
        insights = []
        
        if not records:
            return ["No data available for analysis"]
        
        # Calculate some basic stats
        values = [r.get('value', 0) for r in records]
        avg_value = sum(values) / len(values) if values else 0
        
        insights.append(f"Analyzed {len(records)} data points")
        insights.append(f"Average value: {avg_value:.2f}")
        
        # Sentiment insights if available
        if 'sentiment_summary' in data:
            sentiment = data['sentiment_summary']
            total = sum(sentiment.values())
            if total > 0:
                positive_pct = (sentiment.get('positive', 0) / total) * 100
                insights.append(f"Positive sentiment: {positive_pct:.1f}%")
        
        insights.append("Key recommendation: Further analysis needed for detailed trends")
        
        return insights


class ShowResultsTool:
    """Format and prepare results for output"""
    
    def __init__(self):
        self.name = "Show Results"
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
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