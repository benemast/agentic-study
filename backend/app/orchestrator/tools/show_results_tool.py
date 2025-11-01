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
from typing import Dict, Any, List, Optional
import logging
import time
from collections import Counter

from app.orchestrator.tools.base_tool import BaseTool
from app.orchestrator.tools.visualization_generator import VisualizationGenerator

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
            timeout=60  # Increased for LLM summary generation
        )
        self.websocket_manager = None   # Injected by orchestrator
        self.llm_client = None          # Injected by orchestrator
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
            data = input_data.get('data', {})
            params = input_data.get('params', {})
            session_id = input_data.get('session_id')
            execution_id = input_data.get('execution_id')
            
            # Parse parameters (already validated by Pydantic schema)
            include_sections = params.get('include_sections', ['data_preview'])
            statistics_metrics = params.get('statistics_metrics')
            show_visualizations = params.get('show_visualizations', False)
            max_data_items = params.get('max_data_items', 50)
            
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
            availability = self._check_data_availability(data)
            
            # Generate requested sections
            sections = {}
            sections_available = []
            sections_unavailable = []
            
            for section in include_sections:
                section_data = await self._generate_section(
                    section=section,
                    data=data,
                    availability=availability,
                    statistics_metrics=statistics_metrics,
                    show_visualizations=show_visualizations,
                    max_data_items=max_data_items,
                    session_id=session_id,
                    execution_id=execution_id
                )
                
                sections[section] = section_data
                
                # Track availability
                if section_data.get('available', True):
                    sections_available.append(section)
                else:
                    sections_unavailable.append(section)
            
            execution_time = int((time.time() - start_time) * 1000)
            
            logger.info(
                f" ShowResults: Generated {len(sections_available)} sections "
                f"in {execution_time}ms"
            )
            
            results = {
                'success': True,
                'data': {
                    'sections': sections,
                    'metadata': {
                        'sections_requested': include_sections,
                        'sections_available': sections_available,
                        'sections_unavailable': sections_unavailable,
                        'total_records': len(data.get('records', [])),
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

            self._log_results_to_file(results)

            return results
            
        except Exception as e:
            logger.error(f"❌ Error in ShowResultsTool: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': None
            }
    
    def _check_data_availability(self, data: Dict[str, Any]) -> Dict[str, bool]:
        """
        Check what data is available for sections
        
        Returns:
            {
                'has_records': bool,
                'has_sentiment': bool,
                'has_insights': bool,
                'has_themes': bool,
                'has_enrichments': bool
            }
        """
        records = data.get('records', [])
        
        return {
            'has_records': len(records) > 0,
            'has_sentiment': any(r.get('sentiment') for r in records),
            'has_insights': bool(data.get('insights')),
            'has_themes': bool(data.get('themes')),
            'has_enrichments': bool(data.get('enrichments'))
        }
    
    async def _generate_section(
        self,
        section: str,
        data: Dict[str, Any],
        availability: Dict[str, bool],
        statistics_metrics: List[str],
        show_visualizations: bool,
        max_data_items: int,
        session_id: Optional[str],
        execution_id: Optional[int]
    ) -> Dict[str, Any]:
        """
        Generate a single section based on type
        
        Returns section data or unavailable message
        """
        # Route to appropriate generator
        if section == 'executive_summary':
            return await self._generate_executive_summary(data, availability)
        
        elif section == 'themes':
            return self._generate_themes_section(data, availability)
        
        elif section == 'recommendations':
            return self._generate_recommendations_section(data, availability)
        
        elif section == 'statistics':
            return self._generate_statistics_section(
                data=data,
                availability=availability,
                metrics=statistics_metrics,
                show_visualizations=show_visualizations
            )
        
        elif section == 'data_preview':
            return self._generate_data_preview_section(
                data=data,
                availability=availability,
                max_items=max_data_items
            )
        
        else:
            return {
                'available': False,
                'message': f'Unknown section: {section}'
            }
    
    # ============================================================
    # SECTION GENERATORS
    # ============================================================
    
    async def _generate_executive_summary(
        self,
        data: Dict[str, Any],
        availability: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Generate executive summary using LLM
        
        Summarizes all available data into key takeaways
        """
        records = data.get('records', [])
        
        if not availability['has_records']:
            return {
                'available': False,
                'message': 'No data available for summary',
                'content': None
            }
        
        try:
            # Build context for LLM
            context = self._build_summary_context(data, availability)
            
            # Generate summary using LLM
            system_prompt = """You are a data analyst creating executive summaries.
Generate a concise, professional summary (3-5 bullet points) of the key findings.
Focus on actionable insights and important patterns."""
            
            user_prompt = f"""Analyze this review data and provide a professional, precise and conceise executive summary:

{context}

Provide 3-5 key takeaways as bullet points!"""
            
            response = await self.llm_client.get_completion(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=300,
                temperature=0.3
            )
            
            summary_text = response.get('content', 'Unable to generate summary')
            
            # Parse bullet points
            bullet_points = [
                line.strip('- •*').strip()
                for line in summary_text.split('\n')
                if line.strip() and any(line.strip().startswith(c) for c in ['-', '•', '*'])
            ]
            
            if not bullet_points:
                bullet_points = [summary_text]
            
            return {
                'available': True,
                'content': {
                    'summary': bullet_points,
                    'record_count': len(records),
                    'generated_at': time.strftime('%Y-%m-%d %H:%M:%S')
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating executive summary: {e}")
            # Fallback to simple summary
            return {
                'available': True,
                'content': {
                    'summary': [
                        f'Analyzed {len(records)} reviews',
                        f'{"Sentiment analysis completed" if availability["has_sentiment"] else "No sentiment analysis performed"}',
                        f'{"Business insights generated" if availability["has_insights"] else "No insights generated"}'
                    ],
                    'record_count': len(records),
                    'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'note': 'Fallback summary (LLM unavailable)'
                }
            }
    
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
            insights = data.get('insights', [])[:3]  # Top 3
            context_parts.append(f"Key Insights: {'; '.join(insights)}")
        
        # Add themes
        if availability['has_themes']:
            themes = data.get('themes', [])[:5]  # Top 5
            context_parts.append(f"Main Themes: {', '.join(themes)}")
        
        return '\n'.join(context_parts)
    
    def _generate_themes_section(
        self,
        data: Dict[str, Any],
        availability: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Generate themes section
        
        Requires sentiment analysis to have been run
        """
        if not availability['has_sentiment']:
            return {
                'available': False,
                'message': 'No sentiment analysis data available. Run sentiment analysis tool first.',
                'content': None
            }
        
        records = data.get('records', [])
        
        # Extract themes from sentiment analysis
        # Themes might be stored in data or extracted from records
        themes = data.get('themes', [])
        
        if not themes:
            # Generate themes from sentiment data
            themes = self._extract_themes_from_sentiment(records)
        
        if not themes:
            return {
                'available': False,
                'message': 'No themes could be extracted from sentiment data',
                'content': None
            }
        
        # Calculate theme statistics
        theme_stats = []
        for theme in themes[:10]:  # Top 10 themes
            # Count mentions (this is simplified - real implementation would be more sophisticated)
            mentions = sum(1 for r in records if theme.lower() in r.get('review_body', '').lower())
            
            theme_stats.append({
                'theme': theme,
                'mention_count': mentions,
                'percentage': (mentions / len(records) * 100) if len(records) > 0 else 0
            })
        
        return {
            'available': True,
            'content': {
                'themes': theme_stats,
                'total_themes': len(themes),
                'records_analyzed': len(records)
            }
        }
    
    def _extract_themes_from_sentiment(self, records: List[Dict[str, Any]]) -> List[str]:
        """
        Extract common themes from sentiment-analyzed reviews
        
        This is a simplified implementation - real version would use NLP
        """
        # Common product review themes
        theme_keywords = {
            'Sound Quality': ['sound', 'audio', 'quality', 'bass', 'treble'],
            'Comfort': ['comfortable', 'comfort', 'fit', 'ear', 'wear'],
            'Battery Life': ['battery', 'charge', 'charging', 'power'],
            'Build Quality': ['build', 'quality', 'durable', 'sturdy', 'material'],
            'Noise Cancellation': ['noise', 'cancellation', 'cancel', 'anc', 'isolation'],
            'Price/Value': ['price', 'value', 'worth', 'expensive', 'affordable'],
            'Connectivity': ['bluetooth', 'connection', 'pairing', 'wireless'],
            'Design': ['design', 'look', 'style', 'appearance', 'aesthetic']
        }
        
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
        availability: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Generate recommendations section
        
        Requires sentiment analysis to have been run
        """
        if not availability['has_sentiment']:
            return {
                'available': False,
                'message': 'No sentiment analysis data available. Run sentiment analysis tool first.',
                'content': None
            }
        
        records = data.get('records', [])
        
        # Generate recommendations based on sentiment patterns
        recommendations = []
        
        # Sentiment distribution
        sentiments = [r.get('sentiment') for r in records if r.get('sentiment')]
        sent_counts = Counter(sentiments)
        total = len(sentiments) or 1
        
        negative_pct = (sent_counts.get('negative', 0) / total) * 100
        positive_pct = (sent_counts.get('positive', 0) / total) * 100
        
        if negative_pct > 30:
            recommendations.append({
                'priority': 'high',
                'category': 'Customer Satisfaction',
                'recommendation': 'Address common complaints in negative reviews to improve customer satisfaction',
                'impact': 'Could reduce negative sentiment by targeting key pain points'
            })
        
        if positive_pct > 70:
            recommendations.append({
                'priority': 'medium',
                'category': 'Marketing',
                'recommendation': 'Leverage positive reviews in marketing materials and testimonials',
                'impact': 'Capitalize on strong customer satisfaction to attract new customers'
            })
        
        # Rating-based recommendations
        ratings = [r.get('star_rating') for r in records if r.get('star_rating')]
        if ratings:
            avg_rating = sum(ratings) / len(ratings)
            low_ratings = sum(1 for r in ratings if r <= 2)
            low_pct = (low_ratings / len(ratings)) * 100
            
            if avg_rating < 3.5:
                recommendations.append({
                    'priority': 'high',
                    'category': 'Product Quality',
                    'recommendation': 'Investigate product quality issues causing low ratings',
                    'impact': 'Critical for brand reputation and customer retention'
                })
            
            if low_pct > 20:
                recommendations.append({
                    'priority': 'high',
                    'category': 'Customer Service',
                    'recommendation': 'Implement proactive customer service for 1-2 star reviewers',
                    'impact': 'May recover dissatisfied customers and prevent churn'
                })
        
        # Verification-based
        verified = sum(1 for r in records if r.get('verified_purchase'))
        verified_pct = (verified / len(records)) * 100 if records else 0
        
        if verified_pct < 50:
            recommendations.append({
                'priority': 'medium',
                'category': 'Data Quality',
                'recommendation': 'Encourage verified purchases to improve review authenticity',
                'impact': 'Increases trust and credibility of review data'
            })
        
        # Theme-based (if available)
        if availability['has_themes']:
            recommendations.append({
                'priority': 'medium',
                'category': 'Product Development',
                'recommendation': 'Focus improvements on most-mentioned themes in reviews',
                'impact': 'Aligns product development with customer priorities'
            })
        
        # Default if no specific recommendations
        if not recommendations:
            recommendations.append({
                'priority': 'low',
                'category': 'Analysis',
                'recommendation': 'Continue monitoring review trends over time',
                'impact': 'Maintains awareness of customer sentiment changes'
            })
        
        return {
            'available': True,
            'content': {
                'recommendations': recommendations,
                'total_recommendations': len(recommendations),
                'high_priority_count': sum(1 for r in recommendations if r['priority'] == 'high'),
                'generated_at': time.strftime('%Y-%m-%d %H:%M:%S')
            }
        }
    
    def _generate_statistics_section(
        self,
        data: Dict[str, Any],
        availability: Dict[str, bool],
        metrics: List[str],
        show_visualizations: bool
    ) -> Dict[str, Any]:
        """
        Generate statistics section with optional visualizations
        
        Calculates requested metrics and generates charts if requested
        """
        if not availability['has_records']:
            return {
                'available': False,
                'message': 'No data available for statistics',
                'content': None
            }
        
        records = data.get('records', [])
        statistics = {}
        
        # Calculate each requested metric
        for metric in metrics:
            if metric == 'sentiment_distribution':
                statistics['sentiment_distribution'] = self._calc_sentiment_distribution(records, availability)
            
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
        
        return {
            'available': True,
            'content': {
                'statistics': statistics,
                'visualizations': visualizations,
                'metrics_calculated': list(statistics.keys()),
                'has_visualizations': show_visualizations and visualizations is not None
            }
        }
    
    def _calc_sentiment_distribution(
        self,
        records: List[Dict[str, Any]],
        availability: Dict[str, bool]
    ) -> Dict[str, Any]:
        """Calculate sentiment distribution statistics"""
        if not availability['has_sentiment']:
            return {'available': False, 'message': 'No sentiment data'}
        
        sentiments = [r.get('sentiment') for r in records if r.get('sentiment')]
        sent_counts = Counter(sentiments)
        total = len(sentiments) or 1
        
        return {
            'available': True,
            'total_analyzed': len(sentiments),
            'distribution': {
                'positive': {
                    'count': sent_counts.get('positive', 0),
                    'percentage': (sent_counts.get('positive', 0) / total) * 100
                },
                'neutral': {
                    'count': sent_counts.get('neutral', 0),
                    'percentage': (sent_counts.get('neutral', 0) / total) * 100
                },
                'negative': {
                    'count': sent_counts.get('negative', 0),
                    'percentage': (sent_counts.get('negative', 0) / total) * 100
                }
            }
        }
    
    def _calc_review_summary(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate general review statistics"""
        return {
            'available': True,
            'total_reviews': len(records),
            'avg_review_length': sum(len(r.get('review_body', '')) for r in records) / len(records) if records else 0,
            'verified_count': sum(1 for r in records if r.get('verified_purchase')),
            'has_headline': sum(1 for r in records if r.get('review_headline'))
        }
    
    def _calc_rating_distribution(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate rating distribution statistics"""
        ratings = [r.get('star_rating') for r in records if r.get('star_rating')]
        
        if not ratings:
            return {'available': False, 'message': 'No rating data'}
        
        rating_counts = Counter(ratings)
        
        return {
            'available': True,
            'total_rated': len(ratings),
            'average_rating': sum(ratings) / len(ratings),
            'distribution': {
                str(rating): {
                    'count': rating_counts.get(rating, 0),
                    'percentage': (rating_counts.get(rating, 0) / len(ratings)) * 100
                }
                for rating in [1, 2, 3, 4, 5]
            }
        }
    
    def _calc_verified_rate(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate verified purchase rate"""
        total = len(records)
        verified = sum(1 for r in records if r.get('verified_purchase'))
        
        return {
            'available': True,
            'total_reviews': total,
            'verified_count': verified,
            'verified_percentage': (verified / total * 100) if total > 0 else 0,
            'non_verified_count': total - verified
        }
    
    def _calc_theme_coverage(
        self,
        records: List[Dict[str, Any]],
        availability: Dict[str, bool]
    ) -> Dict[str, Any]:
        """Calculate theme coverage statistics"""
        if not availability['has_themes'] and not availability['has_sentiment']:
            return {'available': False, 'message': 'No theme data'}
        
        themes = self._extract_themes_from_sentiment(records)
        
        return {
            'available': True,
            'total_themes_identified': len(themes),
            'top_themes': themes[:5],
            'reviews_with_themes': len(records)  # Simplified
        }
    
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
            return {'available': False, 'message': 'No sentiment data'}
        
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
        
        return {
            'available': True,
            'total_compared': total,
            'aligned_count': aligned,
            'misaligned_count': misaligned,
            'consistency_percentage': (aligned / total * 100) if total > 0 else 0,
            'note': 'Measures alignment between star ratings and sentiment'
        }
    
    def _generate_data_preview_section(
        self,
        data: Dict[str, Any],
        availability: Dict[str, bool],
        max_items: int
    ) -> Dict[str, Any]:
        """
        Generate data preview section
        
        Shows sample of raw records
        """
        if not availability['has_records']:
            return {
                'available': False,
                'message': 'No data available for preview',
                'content': None
            }
        
        records = data.get('records', [])
        
        # Limit to max_items
        preview_records = records[:max_items]
        
        return {
            'available': True,
            'content': {
                'records': preview_records,
                'total_records': len(records),
                'preview_count': len(preview_records),
                'showing_all': len(records) <= max_items
            }
        }