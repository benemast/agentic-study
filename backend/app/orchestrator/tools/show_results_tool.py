# backend/app/orchestrator/tools/show_results_tool.py
"""
ShowResultsTool - Parameterized Results Display

Generates structured output with configurable sections:
- Executive Summary (LLM-generated)
- Themes (from sentiment analysis)
- Recommendations (from sentiment analysis)
- Statistics (calculated metrics + optional visualizations)
- Data Preview (raw records)

Each section is conditional based on:
1. User parameters (include_sections)
2. Data availability (previous tools)
"""
from typing import Dict, Any, List, Optional, Literal
import logging
import time
from collections import Counter

from app.websocket.manager import WebSocketManager

from app.orchestrator.tools.base_tool import BaseTool
from app.orchestrator.tools.visualization_generator import VisualizationGenerator
from app.orchestrator.graphs.shared_state import SharedWorkflowState

from app.orchestrator.tools.output_schemas.show_results_tool_schema import (
    ExecutiveSummarySection,
    ExecutiveSummaryContent,
    ThemesSection,
    ThemesContent,
    ThemeStatistic,
    RecommendationsSection,
    RecommendationsContent,
    Recommendation,
    StatisticsSection,
    StatisticsContent,
    SentimentDistribution,
    SentimentDistributionData,
    ReviewSummary,
    RatingDistribution,
    RatingDistributionData,
    VerifiedRate,
    ThemeCoverage,
    SentimentConsistency,
    DataPreviewSection,
    DataPreviewContent,
    ShowResultsOutput,
    ShowResultsData,
    ShowResultsSections,
    ShowResultsMetadata
)

logger = logging.getLogger(__name__)


class ShowResultsTool(BaseTool):
    """
    Configurable results display tool
    
    Uses ShowResultsParams schema for parameter validation.
    
    Parameters (validated by ShowResultsParams):
    - include_sections: Which sections to display
    - statistics_metrics: Which metrics to calculate (if statistics included)
    - show_visualizations: Generate charts (if statistics included)
    - max_data_items: Number of records to preview (if data_preview included)
    
    Output Structure:
    {
        "sections": {
            "executive_summary": {...},
            "themes": {...},
            "recommendations": {...},
            "statistics": {...},
            "data_preview": {...}
        },
        "metadata": {
            "sections_included": [...],
            "sections_available": [...],
            "sections_unavailable": [...]
        }
    }
    """
    
    def __init__(self):
        super().__init__(
            name="Show Results",
            timeout=120
        )
        self.websocket_manager: Optional[WebSocketManager] = None   # Injected by orchestrator
        self.llm_client = None                                      # Injected by orchestrator
        self.viz_generator = VisualizationGenerator()
    
    async def _execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate structured results based on parameters
        
        Args:
            input_data: {
                'data': Working data from previous tools,
                'params': ShowResultsParams (validated by Pydantic),
                'session_id': Optional session ID,
                'execution_id': Optional execution ID
            }
        """
        start_time = time.time()
        
        try:
            self._log_input_to_file(input_data)


            # Extract input
            state = input_data.get('state')
            condition= state.get('condition')
            category = state.get('category')
            session_id = input_data.get('session_id')
            execution_id = input_data.get('execution_id')

            records = input_data.get('records', [])
            sentiment_statistics = input_data.get('sentiment_statistics')
            insights = input_data.get('insights')
            theme_analysis = input_data.get('theme_analysis')
            
            # Parse parameters (already validated by Pydantic schema)
            config = input_data.get('config')
            include_sections = config.get('include_sections', ['data_preview'])
            statistics_metrics = config.get('statistics_metrics')
            show_visualizations = config.get('show_visualizations', False)
            max_data_items = config.get('max_data_items', 50)
            
            # Use defaults from schema if not provided
            if statistics_metrics is None and 'statistics' in include_sections:
                statistics_metrics = [
                    'sentiment_distribution',
                    'review_summary', 
                    'rating_distribution',
                    'verified_rate'
                ]
            elif statistics_metrics is None:
                statistics_metrics = []
            
            logger.info(
                f"📊 ShowResults: Generating {len(include_sections)} sections "
                f"(viz={show_visualizations})"
            )
            
            # Check data availability
            availability = self._check_data_availability(input_data)
            
            # Generate requested sections
            sections = {}
            sections_available = []
            sections_unavailable = []
            
            for section in include_sections:

                if section == 'themes' and theme_analysis:
                    section_data =  self._generate_themes_section(
                        input_data, 
                        records=records,
                        themes=theme_analysis,
                        category=category,
                        availability=availability
                    )
                
                elif section == 'recommendations':
                    section_data = self._generate_recommendations_section(
                        data=input_data, 
                        records=records,
                        availability=availability
                    )
                
                elif section == 'statistics':
                    section_data =  self._generate_statistics_section(
                        data=input_data,
                        sentiment_statistics= sentiment_statistics,
                        availability=availability,
                        metrics=statistics_metrics,
                        show_visualizations=show_visualizations
                    )
                
                elif section == 'data_preview':
                    logger.info(f"Request {section} for max. {max_data_items} of {len(records)} records. Data reported available: {availability}")
                    section_data =  self._generate_data_preview_section(
                        records=records,
                        availability=availability,
                        max_items=max_data_items
                    )

                
                sections[section] = section_data
                
                # Track availability
                if section_data.get('available', True):
                    sections_available.append(section)
                else:
                    sections_unavailable.append(section)
            
            if 'executive_summary' in include_sections:            
                    section_data = await self._generate_executive_summary(
                        data=input_data,
                        availability=availability,
                        session_id=session_id,
                        execution_id=execution_id,
                        condition=condition
                    )
            
            execution_time = int((time.time() - start_time) * 1000)
            
            logger.info(
                f" ShowResults: Generated {len(sections_available)} sections "
                f"in {execution_time}ms"
            )
            
            # Build metadata
            metadata = ShowResultsMetadata(
                sections_requested=include_sections,
                sections_available=sections_available,
                sections_unavailable=sections_unavailable,
                total_records=len(input_data.get('records', [])),
                has_sentiment=availability['has_sentiment'],
                has_insights=availability['has_insights'],
                processed_at=time.strftime('%Y-%m-%d %H:%M:%S')
            )
            
            # Build sections container
            sections_container = ShowResultsSections(**sections)
            
            # Build data payload
            data_payload = ShowResultsData(
                sections=sections_container,
                metadata=metadata
            )
            
            # Validate and build final output
            output = ShowResultsOutput(
                success=True,
                data=data_payload,
                error=None,
                execution_time_ms=execution_time,
                metadata={
                    'tool': self.name,
                    'output_ready': True,
                    'is_final_output': True
                }
            )
            
            # Convert to dict for compatibility
            results = output.model_dump(exclude_none=True)
            
            """
            results = {
                'success': True,
                'data': {
                    'sections': sections,
                    'metadata': {
                        'sections_requested': include_sections,
                        'sections_available': sections_available,
                        'sections_unavailable': sections_unavailable,
                        'total_records': len(input_data.get('total')),
                        'has_sentiment': availability['has_sentiment'],
                        'has_insights': availability['has_insights'],
                        'processed_at': time.strftime('%Y-%m-%d %H:%M:%S')
                    }
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'output_ready': True,
                    'is_final_output': True
                }
            }
            """
            self._log_results_to_file(results)

            return results
            
        except Exception as e:
            logger.error(f"Error in ShowResultsTool: {e}", exc_info=True)
            
            # Return validated error response
            error_output = ShowResultsOutput(
                success=False,
                error=str(e),
                data=None
            )
            
            return error_output.model_dump(exclude_none=True)
    
    def _check_data_availability(self, data: Dict[str, Any]) -> Dict[str, bool]:
        """
        Check what data is available for sections
        
        Returns:
            {
                'has_records': bool,
                'has_sentiment': bool,
                'has_insights': bool,
                'has_themes': bool
            }
        """
        return {
            'has_records': len(data.get('records', [])) > 0,
            'has_sentiment': bool(data.get('sentiment_statistics')),
            'has_insights': bool(data.get('insights')),
            'has_themes': bool(data.get('theme_analysis'))
        }
        
    # ============================================================
    # SECTION GENERATORS
    # ============================================================
    
    async def _generate_executive_summary(
        self,
        data: Dict[str, Any],
        availability: Dict[str, bool],
        session_id: str,
        execution_id: int,
        condition: str,
        step:Optional[int] = None,
        total_steps:Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate executive summary using LLM
        
        Summarizes all available data into key takeaways
        """
        records = data.get('records', [])
        
        if not availability['has_records']:
            section = ExecutiveSummarySection(
                available=False,
                message='No data available for summary',
                content=None
            )
            return section.model_dump(exclude_none=True)
        
        try:
            # Build context for LLM
            context = self._build_summary_context(data, availability)
            
            # Generate summary using LLM
            system_prompt = """You are a data analyst creating executive summaries.
Generate a concise, professional summary (3-5 bullet points) highlighting the key findings.
Focus on actionable insights and important patterns."""
            
            user_prompt = f"""Analyze this review data and provide a professional, precise and conceise executive summary:

{context}

# Output Format
Provide a JSON object with this exact structure:
- Keys: String numbers for each review (e.g., "1", "2", ...).
- Values: Lists containing up to four arrays, each array in order: [topic string, importance integer (1-7), sentiment integer (1-7)].
- Every input review must be present as a sequential key.
- If a review only mentions one or two topics, include only those in its value array.
- Example format:
```json
{
  ["Highlight Title: somethign something","Highlight Title: somethign something","Highlight Title: somethign something", ... ]
}
```

Provide 3-5 key takeaways as bullet points!"""
            
            response = await self._call_llm_with_streaming(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                tool_name='show_results',
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=8192,
                parsed=True
            )
            
            # Validate and build content
            content = ExecutiveSummaryContent(
                summary=response if isinstance(response, list) else [str(response)],
                record_count=len(records),
                generated_at=time.strftime('%Y-%m-%d %H:%M:%S')
            )
            
            section = ExecutiveSummarySection(
                available=True,
                content=content
            )
            
            return section.model_dump(exclude_none=True)
            
        except Exception as e:
            logger.error(f"Error generating executive summary: {e}")
            # Fallback to simple summary
            content = ExecutiveSummaryContent(
                summary=[
                    f'Analyzed {len(records)} reviews',
                    f'{"Sentiment analysis completed" if availability["has_sentiment"] else "No sentiment analysis performed"}',
                    f'{"Business insights generated" if availability["has_insights"] else "No insights generated"}'
                ],
                record_count=len(records),
                generated_at=time.strftime('%Y-%m-%d %H:%M:%S'),
                note='Fallback summary (LLM unavailable)'
            )
            
            section = ExecutiveSummarySection(
                available=True,
                content=content
            )
            
            return section.model_dump(exclude_none=True)
    
    def _build_summary_context(
        self,
        data: Dict[str, Any],
        availability: Dict[str, bool]
    ) -> str:
        """Build context string for LLM summary"""
        records = data.get('records', [])
        context_parts = [f"Total Reviews: {len(records)}"]
        
        # Add rating info
        ratings = [r.get('star_rating') for r in records if r.get('star_rating')]
        if ratings:
            avg_rating = sum(ratings) / len(ratings)
            context_parts.append(f"Average Rating: {avg_rating:.2f}/5.0")
            rating_dist = Counter(ratings)
            context_parts.append(f"Rating Distribution: {dict(rating_dist)}")
        
        # Add sentiment info
        if availability['has_sentiment']:
            sentiments = [r.get('sentiment') for r in records if r.get('sentiment')]
            sent_dist = Counter(sentiments)
            context_parts.append(f"Sentiment Distribution: {dict(sent_dist)}")
        
        # Add insights
        if availability['has_insights']:
            insights = data.get('insights', [])[:3]
            context_parts.append(f"Key Insights: {'; '.join(insights)}")
        
        # Add themes
        if availability['has_themes']:
            themes = data.get('themes', [])[:3]
            context_parts.append(f"Main Themes: {', '.join(themes)}")
        
        return '\n'.join(context_parts)
    
    def _generate_themes_section(
        self,
        data: Dict[str, Any],
        records: List[Dict[str, Any]],
        themes: List[tuple[str, int, float]],
        category: Literal['shoes', 'wireless'],
        availability: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Generate themes section
        
        Requires sentiment analysis to have been run
        """
        if not availability['has_sentiment']:
            section = ThemesSection(
                available=False,
                message='No sentiment analysis data available. Run sentiment analysis tool first.',
                content=None
            )
            return section.model_dump(exclude_none=True)
        
        
        
        if not themes:
            # Generate themes from sentiment data
            themes = self._extract_themes_from_sentiment(records, category)
        
        if not themes:
            section = ThemesSection(
                available=False,
                message='No themes could be extracted from sentiment data',
                content=None
            )
            return section.model_dump(exclude_none=True)
        
        # Calculate theme statistics
        theme_stats = []
        for theme in themes:
            # Count mentions (this is simplified - real implementation would be more sophisticated)
            mentions = sum(1 for r in records if theme.lower() in r.get('review_body', '').lower())
            
            stat = ThemeStatistic(
                theme=theme,
                mention_count=mentions,
                percentage=(mentions / len(records) * 100) if len(records) > 0 else 0
            )
            theme_stats.append(stat)
        
        content = ThemesContent(
            themes=theme_stats,
            total_themes=len(themes),
            records_analyzed=len(records)
        )
        
        section = ThemesSection(
            available=True,
            content=content
        )
        
        return section.model_dump(exclude_none=True)
    
    def _extract_themes_from_sentiment(
        self,
        records: List[Dict[str, Any]],
        category: Literal['shoes', 'wireless']
    ) -> List[str]:
        """
        Extract common themes from sentiment-analyzed reviews
        
        This is a simplified implementation - real version would use NLP
        """
        # Common product review themes
        theme_keywords_headphones = {
            'Sound Quality': ['sound', 'audio', 'quality', 'bass', 'treble', 'clarity', 'crisp', 'clear', 'balanced', 'rich', 'deep', 'highs', 'lows', 'mids', 'frequency'],
            'Comfort': ['comfortable', 'comfort', 'fit', 'ear', 'wear', 'cushion', 'padding', 'soft', 'lightweight', 'ergonomic', 'snug', 'tight', 'loose', 'pressure'],
            'Battery Life': ['battery', 'charge', 'charging', 'power', 'hours', 'runtime', 'lifespan', 'discharge', 'usb-c', 'recharge'],
            'Build Quality': ['build', 'quality', 'durable', 'sturdy', 'material', 'solid', 'plastic', 'metal', 'construction', 'robust', 'fragile', 'break'],
            'Noise Cancellation': ['noise', 'cancellation', 'cancel', 'anc', 'isolation', 'ambient', 'passive', 'active', 'block', 'reduce'],
            'Price/Value': ['price', 'value', 'worth', 'expensive', 'affordable', 'cheap', 'cost', 'money', 'budget', 'overpriced', 'deal'],
            'Connectivity': ['bluetooth', 'connection', 'pairing', 'wireless', 'wired', 'cable', 'disconnect', 'signal', 'range', 'latency'],
            'Design': ['design', 'look', 'style', 'appearance', 'aesthetic', 'sleek', 'modern', 'elegant', 'bulky', 'compact', 'foldable']
        }

        theme_keywords_shoes = {
            'Comfort': ['comfortable', 'comfort', 'cushion', 'padding', 'soft', 'support', 'insole', 'footbed', 'wear', 'break-in'],
            'Fit/Sizing': ['fit', 'size', 'sizing', 'true to size', 'narrow', 'wide', 'tight', 'loose', 'length', 'width', 'toe box', 'arch', 'ankle', 'heel', 'calf'],
            'Durability': ['durable', 'scuff', 'wear', 'durability', 'quality', 'last', 'wear out', 'tear', 'material', 'construction', 'sturdy', 'robust'],
            'Performance': ['performance', 'run', 'running', 'speed', 'grip', 'traction', 'stability', 'responsive', 'bounce', 'energy return'],
            'Support': ['support', 'cushioning', 'stability', 'motion control', 'pronation'],
            'Weight': ['weight', 'lightweight', 'heavy', 'light', 'ounces', 'grams'],
            'Breathability': ['breathable', 'breathability', 'ventilation', 'airflow', 'mesh', 'hot', 'cool', 'sweaty'],
            'Price/Value': ['price', 'value', 'worth', 'expensive', 'affordable', 'cheap', 'cost', 'money', 'budget', 'overpriced'],
            'Design/Style': ['design', 'style', 'look', 'appearance', 'color', 'aesthetic', 'sleek', 'modern', 'attractive', 'ugly'],
            'Sole/Outsole': ['sole', 'outsole', 'rubber', 'wear', 'grip', 'tread', 'traction', 'slippery']
        }
        
        theme_keywords = theme_keywords_shoes if category == "shoes" else theme_keywords_headphones

        # Count theme mentions
        theme_counts = {}
        for theme, keywords in theme_keywords.items():
            count = 0
            for record in records:
                body = record.get('review_body', '').lower()
                if any(keyword in body for keyword in keywords):
                    count += 1
            if count > 0:
                theme_counts[theme] = count
        
        # Return themes sorted by frequency
        sorted_themes = sorted(theme_counts.items(), key=lambda x: x[1], reverse=True)
        return [theme for theme, count in sorted_themes]
    
    def _generate_recommendations_section(
        self,
        data: Dict[str, Any],
        records: List[Dict[str, Any]],
        availability: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Generate recommendations section
        
        Requires sentiment analysis to have been run
        """
        if not availability['has_sentiment']:
            section = RecommendationsSection(
                available=False,
                message='No sentiment analysis data available. Run sentiment analysis tool first.',
                content=None
            )
            return section.model_dump(exclude_none=True)
        
        
        # Generate recommendations based on sentiment patterns
        recommendations = []
        
        # Sentiment distribution
        sentiments = [r.get('sentiment') for r in records if r.get('sentiment')]
        sent_counts = Counter(sentiments)
        total = len(sentiments) or 1
        
        negative_pct = (sent_counts.get('negative', 0) / total) * 100
        positive_pct = (sent_counts.get('positive', 0) / total) * 100
        
        if negative_pct > 30:
            rec = Recommendation(
                priority='high',
                category='Customer Satisfaction',
                recommendation='Address common complaints in negative reviews to improve customer satisfaction',
                impact='Could reduce negative sentiment by targeting key pain points'
            )
            recommendations.append(rec)
        
        if positive_pct > 70:
            rec = Recommendation(
                priority='medium',
                category='Marketing',
                recommendation='Leverage positive reviews in marketing materials and testimonials',
                impact='Capitalize on strong customer satisfaction to attract new customers'
            )
            recommendations.append(rec)
        
        # Rating-based recommendations
        ratings = [r.get('star_rating') for r in records if r.get('star_rating')]
        if ratings:
            avg_rating = sum(ratings) / len(ratings)
            low_ratings = sum(1 for r in ratings if r <= 2)
            low_pct = (low_ratings / len(ratings)) * 100
            
            if avg_rating < 3.5:
                rec = Recommendation(
                    priority='high',
                    category='Product Quality',
                    recommendation='Investigate product quality issues causing low ratings',
                    impact='Critical for brand reputation and customer retention'
                )
                recommendations.append(rec)
            
            if low_pct > 20:
                rec = Recommendation(
                    priority='high',
                    category='Customer Service',
                    recommendation='Implement proactive customer service for 1-2 star reviewers',
                    impact='May recover dissatisfied customers and prevent churn'
                )
                recommendations.append(rec)
        
        # Verification-based
        verified = sum(1 for r in records if r.get('verified_purchase'))
        verified_pct = (verified / len(records)) * 100 if records else 0
        
        if verified_pct < 50:
            rec = Recommendation(
                priority='medium',
                category='Data Quality',
                recommendation='Encourage verified purchases to improve review authenticity',
                impact='Increases trust and credibility of review data'
            )
            recommendations.append(rec)
        
        # Theme-based (if available)
        if availability['has_themes']:
            rec = Recommendation(
                priority='medium',
                category='Product Development',
                recommendation='Focus improvements on most-mentioned themes in reviews',
                impact='Aligns product development with customer priorities'
            )
            recommendations.append(rec)
        
        # Default if no specific recommendations
        if not recommendations:
            rec = Recommendation(
                priority='low',
                category='Analysis',
                recommendation='Continue monitoring review trends over time',
                impact='Maintains awareness of customer sentiment changes'
            )
            recommendations.append(rec)
        
        content = RecommendationsContent(
            recommendations=recommendations,
            total_recommendations=len(recommendations),
            high_priority_count=sum(1 for r in recommendations if r.priority == 'high'),
            generated_at=time.strftime('%Y-%m-%d %H:%M:%S')
        )
        
        section = RecommendationsSection(
            available=True,
            content=content
        )
        
        return section.model_dump(exclude_none=True)
    
    def _generate_statistics_section(
        self,
        data: Dict[str, Any],
        sentiment_statistics: Dict[str, Any],
        availability: Dict[str, bool],
        metrics: List[str],
        show_visualizations: bool
    ) -> Dict[str, Any]:
        """
        Generate statistics section with optional visualizations
        
        Calculates requested metrics and generates charts if requested
        """
        if not availability['has_records']:
            section = StatisticsSection(
                available=False,
                message='No data available for statistics',
                content=None
            )
            return section.model_dump(exclude_none=True)
        
        records = data.get('records', [])
        statistics = {}
        
        # Calculate each requested metric
        for metric in metrics:
            if metric == 'sentiment_distribution':
                
                dist = SentimentDistribution(
                    available=False,
                    message='No sentiment data'
                )

                if availability['has_sentiment']:                    
                    dist = SentimentDistribution(
                        available=True,
                        total_analyzed=len(sentiment_statistics.get('total')),
                        distribution={
                            'positive': SentimentDistributionData(
                                count=sentiment_statistics.get('positive'),
                                percentage=sentiment_statistics.get('percentage',{}).get('positive')
                            ),
                            'neutral': SentimentDistributionData(
                                count=sentiment_statistics.get('neutral'),
                                percentage=sentiment_statistics.get('percentage',{}).get('neutral')
                            ),
                            'negative': SentimentDistributionData(
                                count=sentiment_statistics.get('negative'),
                                percentage=sentiment_statistics.get('percentage',{}).get('negative')
                            )
                        }
                    )

                statistics['sentiment_distribution']= dist.model_dump(exclude_none=True)
            
            elif metric == 'review_summary':
                statistics['review_summary'] = self._calc_review_summary(records)
            
            elif metric == 'rating_distribution':
                statistics['rating_distribution'] = self._calc_rating_distribution(records)
            
            elif metric == 'verified_rate':
                statistics['verified_rate'] = self._calc_verified_rate(records)
            
            elif metric == 'theme_coverage':
                statistics['theme_coverage'] = self._calc_theme_coverage(records, availability)
            
            elif metric == 'sentiment_consistency':
                statistics['sentiment_consistency'] = self._calc_sentiment_consistency(records, availability)
        
        # Generate visualizations if requested
        visualizations = None
        if show_visualizations:
            visualizations = self.viz_generator.generate_all_visualizations(data)
        
        content = StatisticsContent(
            statistics=statistics,
            visualizations=visualizations,
            metrics_calculated=list(statistics.keys()),
            has_visualizations=show_visualizations and visualizations is not None
        )
        
        section = StatisticsSection(
            available=True,
            content=content
        )
        
        return section.model_dump(exclude_none=True)

    
    def _calc_review_summary(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate general review statistics"""
        summary = ReviewSummary(
            available=True,
            total_reviews=len(records),
            avg_review_body_length=sum(len(r.get('review_body', '')) for r in records) / len(records) if records else 0,
            avg_review_headline_length=sum(len(r.get('review_headline', '')) for r in records) / len(records) if records else 0,
            verified_count=sum(1 for r in records if r.get('verified_purchase')),
        )
        
        return summary.model_dump(exclude_none=True)
    
    def _calc_rating_distribution(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate rating distribution statistics"""
        ratings = [r.get('star_rating') for r in records if r.get('star_rating')]
        
        if not ratings:
            dist = RatingDistribution(
                available=False,
                message='No rating data'
            )
            return dist.model_dump(exclude_none=True)
        
        rating_counts = Counter(ratings)
        
        dist = RatingDistribution(
            available=True,
            total_rated=len(ratings),
            average_rating=sum(ratings) / len(ratings),
            distribution={
                str(rating): RatingDistributionData(
                    count=rating_counts.get(rating, 0),
                    percentage=(rating_counts.get(rating, 0) / len(ratings)) * 100
                )
                for rating in [1, 2, 3, 4, 5]
            }
        )
        
        return dist.model_dump(exclude_none=True)
    
    def _calc_verified_rate(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate verified purchase rate"""
        total = len(records)
        verified = sum(1 for r in records if r.get('verified_purchase'))
        
        rate = VerifiedRate(
            available=True,
            total_reviews=total,
            verified_count=verified,
            verified_percentage=(verified / total * 100) if total > 0 else 0,
            non_verified_count=total - verified
        )
        
        return rate.model_dump(exclude_none=True)
    
    def _calc_theme_coverage(
        self,
        records: List[Dict[str, Any]],
        category: Literal['shoes', 'wireless'],
        availability: Dict[str, bool]
    ) -> Dict[str, Any]:
        """Calculate theme coverage statistics"""
        if not availability['has_themes'] and not availability['has_sentiment']:
            coverage = ThemeCoverage(
                available=False,
                message='No theme data'
            )
            return coverage.model_dump(exclude_none=True)
        
        themes = self._extract_themes_from_sentiment(records, category)
        
        coverage = ThemeCoverage(
            available=True,
            total_themes_identified=len(themes),
            top_themes=themes[:3],
            reviews_with_themes=len(records)
        )
        
        return coverage.model_dump(exclude_none=True)
    
    def _calc_sentiment_consistency(
        self,
        records: List[Dict[str, Any]],
        availability: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Calculate sentiment consistency
        
        Measures how well sentiment aligns with ratings
        """
        if not availability['has_sentiment']:
            consistency = SentimentConsistency(
                available=False,
                message='No sentiment data'
            )
            return consistency.model_dump(exclude_none=True)
        
        # Count alignment between rating and sentiment
        aligned = 0
        misaligned = 0
        
        for record in records:
            rating = record.get('star_rating')
            sentiment = record.get('sentiment')
            
            if rating and sentiment:
                # Expected alignment
                if rating >= 4 and sentiment == 'positive':
                    aligned += 1
                elif rating == 3 and sentiment == 'neutral':
                    aligned += 1
                elif rating <= 2 and sentiment == 'negative':
                    aligned += 1
                else:
                    misaligned += 1
        
        total = aligned + misaligned
        
        consistency = SentimentConsistency(
            available=True,
            total_compared=total,
            aligned_count=aligned,
            misaligned_count=misaligned,
            consistency_percentage=(aligned / total * 100) if total > 0 else 0,
            note='Measures alignment between star ratings and sentiment'
        )
        
        return consistency.model_dump(exclude_none=True)
    
    def _generate_data_preview_section(
        self,
        records:List[Dict[str, Any]],
        availability: Dict[str, bool],
        max_items: int
    ) -> Dict[str, Any]:
        """
        Generate data preview section
        
        Shows sample of raw records
        """
        if not availability['has_records']:
            section = DataPreviewSection(
                available=False,
                message='No data available for preview',
                content=None
            )
            return section.model_dump(exclude_none=True)
        
        # Limit to max_items
        preview_records = records[:max_items]
        
        content = DataPreviewContent(
            records=preview_records,
            total_records=len(records),
            preview_count=len(preview_records),
            showing_all=len(records) <= max_items
        )
        
        section = DataPreviewSection(
            available=True,
            content=content
        )
        
        return section.model_dump(exclude_none=True)