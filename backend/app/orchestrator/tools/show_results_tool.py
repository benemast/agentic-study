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
from typing import Dict, Any, List, Optional, Literal, Union
import logging
import time
from collections import Counter

from app.websocket.manager import WebSocketManager

from app.orchestrator.tools.base_tool import BaseTool
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


from app.orchestrator.llm.tool_schemas import ShowResultsInputData

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
            tool_id="show-results",
            description="Prepare processed customer review data for return to user. This is the FINAL / END step of any workflow! For best results other operations like filter, clean, analyze and generate insights should be completed first!",
            timeout=120
        )
        self.websocket_manager: Optional[WebSocketManager] = None   # Injected by orchestrator
        self.llm_client = None                                      # Injected by orchestrator
    
    @staticmethod
    def _get_priority_keywords(language: Literal['en', 'de']) -> tuple[List[str], List[str]]:
        """Get priority keywords for specified language"""
        high_priority_en = [
            'critical', 'urgent', 'immediate', 'essential', 'must', 'required',
            'crucial', 'vital', 'imperative', 'pressing', 'priority', 'asap',
            'emergency', 'serious', 'severe', 'major issue', 'failing'
        ]
        low_priority_en = [
            'consider', 'potential', 'could', 'might', 'possible', 'optional',
            'nice to have', 'future', 'eventually', 'long-term', 'explore',
            'investigate', 'minor', 'small', 'slight', 'marginal'
        ]
        
        high_priority_de = [
            'kritisch', 'dringend', 'sofort', 'unverzüglich', 'umgehend', 'essentiell', 
            'notwendig', 'erforderlich', 'zwingend', 'unbedingt', 'muss', 'pflicht',
            'entscheidend', 'vital', 'unerlässlich', 'dringlichkeit', 'priorität',
            'eilig', 'akut', 'notfall', 'ernst', 'schwerwiegend', 'gravierend',
            'großes problem', 'fehler', 'versagt', 'defekt'
        ]
        low_priority_de = [
            'überlegen', 'erwägen', 'eventuell', 'möglich', 'könnte', 'vielleicht',
            'optional', 'wünschenswert', 'nice to have', 'zukunft', 'langfristig',
            'später', 'irgendwann', 'erkunden', 'untersuchen', 'prüfen',
            'geringfügig', 'klein', 'leicht', 'marginal', 'unbedeutend', 'nebensächlich'
        ]
        
        if language == 'de':
            return high_priority_de, low_priority_de
        return high_priority_en, low_priority_en
    
    @staticmethod
    def _get_impact_keywords(language: Literal['en', 'de']) -> tuple[List[str], List[str]]:
        """Get impact keywords for specified language"""
        high_impact_en = [
            'significant', 'major', 'critical', 'substantial', 'large',
            'dramatic', 'transformative', 'game-changing', 'breakthrough',
            'revolutionary', 'massive', 'huge', 'enormous', 'extensive',
            'considerable', 'profound', 'far-reaching', 'widespread',
            'high-value', 'strategic', 'key', 'fundamental'
        ]
        low_impact_en = [
            'minor', 'small', 'slight', 'marginal', 'minimal', 'limited',
            'incremental', 'modest', 'negligible', 'tiny', 'little',
            'low-impact', 'trivial', 'cosmetic', 'surface-level',
            'insignificant', 'unimportant', 'peripheral', 'secondary',
            'auxiliary', 'supplementary', 'ancillary', 'nominal'
        ]
        
        high_impact_de = [
            'signifikant', 'bedeutend', 'erheblich', 'wesentlich', 'substanziell',
            'beträchtlich', 'kritisch', 'groß', 'massiv', 'enorm', 'gewaltig',
            'dramatisch', 'transformativ', 'bahnbrechend', 'revolutionär',
            'durchschlagend', 'tiefgreifend', 'weitreichend', 'umfassend',
            'grundlegend', 'fundamental', 'zentral', 'strategisch', 'schlüssel',
            'kernpunkt', 'hauptsächlich', 'hochwertig', 'essenziell'
        ]
        low_impact_de = [
            'geringfügig', 'klein', 'leicht', 'marginal', 'minimal', 'begrenzt',
            'gering', 'unbedeutend', 'unwesentlich', 'beschränkt', 'eingeschränkt',
            'inkrementell', 'moderat', 'vernachlässigbar', 'winzig', 'kaum',
            'niedrig', 'trivial', 'kosmetisch', 'oberflächlich',
            'unwichtig', 'peripher', 'sekundär', 'nebensächlich',
            'ergänzend', 'zusätzlich', 'beiläufig', 'nominal'
        ]
        
        if language == 'de':
            return high_impact_de, low_impact_de
        return high_impact_en, low_impact_en
    
    async def _run(self, input_data: ShowResultsInputData) -> ShowResultsOutput:
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
            state = input_data.get('state', {})
            condition = state.get('condition')
            category = state.get('category')
            session_id = input_data.get('session_id')
            execution_id = input_data.get('execution_id')

            records = input_data.get('records', [])
            sentiment_statistics = input_data.get('sentiment_statistics')
            insights = input_data.get('insights')
            theme_analysis = input_data.get('theme_analysis')
            total_records = input_data.get('total', len(records))
            
            # Parse parameters (already validated by Pydantic schema)
            config = input_data.get('config', {})
            include_sections = config.get('include_sections', ['data_preview'])
            statistics_metrics = config.get('statistics_metrics')
            show_visualizations = config.get('show_visualizations', False)
            max_data_items = config.get('max_data_items', 50)
            
            if statistics_metrics is None:
                statistics_metrics = []
            
            logger.info(
                f"ShowResults: Generating {len(include_sections)} sections "
            )
            
            # Aggregate themes if present
            if theme_analysis:
                theme_analysis = self._aggregate_themes(theme_analysis, total_records)
            
            # Aggregate insights if present
            if insights:
                insights = self._aggregate_insights(insights)
            
            # Aggregate sentiment statistics if present
            if sentiment_statistics:
                sentiment_statistics = self._aggregate_sentiment_stats(sentiment_statistics)
            
            # Check data availability
            availability = self._check_data_availability(input_data)
            
            # Generate requested sections
            sections = {}
            sections_available = []
            sections_unavailable = []
            
            for section in include_sections:
                # Skip executive_summary - it's generated last after other sections
                if section == 'executive_summary':
                    continue
                
                section_obj = None
                
                if section == 'themes':
                    section_obj = self._generate_themes_section(
                        data=input_data, 
                        records=records,
                        theme_analysis=theme_analysis,
                        category=category,
                        availability=availability
                    )
                
                elif section == 'recommendations':
                    section_obj = self._generate_recommendations_section(
                        data=input_data, 
                        records=records,
                        insights=insights,
                        availability=availability,
                        language=state.get('language', 'en')
                    )
                
                elif section == 'statistics':
                    section_obj = self._generate_statistics_section(
                        data=input_data,
                        sentiment_statistics=sentiment_statistics,
                        availability=availability,
                        category=category,
                        metrics=statistics_metrics,
                        show_visualizations=show_visualizations
                    )
                
                elif section == 'data_preview':
                    logger.info(
                        f"Generating {section} for max {max_data_items} of "
                        f"{len(records)} records"
                    )
                    section_obj = self._generate_data_preview_section(
                        records=records,
                        availability=availability,
                        max_items=max_data_items
                    )
                
                # Store section if it was generated
                if section_obj:
                    sections[section] = section_obj
                    
                    # Track availability
                    if section_obj.available:
                        sections_available.append(section)
                    else:
                        sections_unavailable.append(section)
            
            # Generate executive summary LAST (after all other sections)
            # This allows it to summarize all available section data
            if 'executive_summary' in include_sections:
                # Update input_data with aggregated data for summary generation
                summary_data = {
                    **input_data,
                    'theme_analysis': theme_analysis,
                    'insights': insights,
                    'sentiment_statistics': sentiment_statistics
                }

                section_obj = await self._generate_executive_summary(
                    data=summary_data,
                    availability=availability,
                    session_id=session_id,
                    execution_id=execution_id,
                    condition=condition,
                    language=state.get("language")
                )
                
                sections['executive_summary'] = section_obj
                
                if section_obj.available:
                    sections_available.append('executive_summary')
                else:
                    sections_unavailable.append('executive_summary')
            
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
                total_records=len(records),
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
    
    # ============================================================
    # AGGREGATION METHODS
    # ============================================================
    
    def _aggregate_themes(self, theme_data: Union[List[Dict], Dict], total_records: int = None) -> Union[List[Dict], Dict]:
        """
        Aggregate themes by normalizing their names and partial matching.
        Maintains sentiment split structure if present - NEVER aggregates across sentiments.
        
        Args:
            theme_data: Either a list of themes or dict with sentiment keys
            total_records: Total number of records in the full dataset (from data.total)
            
        Returns:
            Aggregated themes in same structure as input, with projected counts
        """
        def normalize_theme_name(theme: str) -> str:
            """Normalize theme name: convert all delimiters to /, remove spaces around /"""
            # Replace common delimiters with /
            normalized = theme.replace('|', '/').replace(',', '/').replace(';', '/').replace('\\', '/')
            # Remove spaces around /
            normalized = '/'.join(part.strip() for part in normalized.split('/'))
            return normalized.lower()
        
        def get_theme_parts(theme: str) -> frozenset:
            """Get individual parts of a theme (split by /) as frozenset for order-independent comparison"""
            return frozenset(part.strip().lower() for part in theme.split('/') if part.strip())
        
        def is_partial_match(theme1: str, theme2: str) -> bool:
            """
            Check if theme1 and theme2 should be merged.
            Returns True if one is a subset of the other OR if they have identical parts.
            """
            parts1 = get_theme_parts(theme1)
            parts2 = get_theme_parts(theme2)
            
            # Exact match (same parts, different order) OR one is subset of the other
            return parts1 == parts2 or parts1.issubset(parts2) or parts2.issubset(parts1)
        
        def find_matching_key(normalized: str, existing_keys: List[str]) -> Optional[str]:
            """Find existing key that matches the normalized theme"""
            for key in existing_keys:
                if is_partial_match(normalized, key):
                    return key
            return None
        
        def merge_theme_names(theme1: str, theme2: str) -> str:
            """Merge two theme names, keeping the more complete one, or alphabetically sorted if equal"""
            parts1 = get_theme_parts(theme1)
            parts2 = get_theme_parts(theme2)
            
            # If same parts (just different order), return alphabetically sorted version
            if parts1 == parts2:
                sorted_parts = sorted(parts1)
                return '/'.join(sorted_parts)
            
            # Keep the one with more parts (more specific)
            if len(parts1) >= len(parts2):
                return theme1
            else:
                return theme2
        
        def aggregate_theme_list(themes: List[Dict], total_records: int = None) -> List[Dict]:
            """
            Aggregate a single list of themes.
            ONLY aggregates within this list not cross sentiment boundaries.
            
            Args:
                themes: List of theme dictionaries to aggregate
                total_records: Total number of records in the full dataset (for projection)
            """
            if not themes:
                return []
            
            aggregated = {}
            
            for theme in themes:
                theme_name = theme.get('theme', '')
                if not theme_name:
                    continue
                    
                normalized = normalize_theme_name(theme_name)
                
                # Check if this matches any existing theme
                matching_key = find_matching_key(normalized, list(aggregated.keys()))
                
                if matching_key:
                    # Merge with existing - keep more complete name
                    merged_name = merge_theme_names(normalized, matching_key)
                    
                    # If merged name is different, we need to update the key
                    if merged_name != matching_key:
                        old_data = aggregated.pop(matching_key)
                        aggregated[merged_name] = {
                            'theme': merged_name,
                            'weighted_score': old_data['weighted_score'] + theme.get('weighted_score', 0),
                            'review_count': old_data['review_count'] + theme.get('review_count', 0),
                        }
                    else:
                        aggregated[matching_key]['weighted_score'] += theme.get('weighted_score', 0)
                        aggregated[matching_key]['review_count'] += theme.get('review_count', 0)
                else:
                    # First occurrence - use normalized name
                    aggregated[normalized] = {
                        'theme': normalized,
                        'weighted_score': theme.get('weighted_score', 0),
                        'review_count': theme.get('review_count', 0),
                    }
            
            # Convert back to list
            result = list(aggregated.values())
            
            # Calculate percentages based on TOTAL of all aggregated review_counts in this sentiment group
            if result:
                # Sum of all review counts in THIS sentiment group (the analyzed sample)
                total_analyzed_in_group = sum(t['review_count'] for t in result)
                
                if total_analyzed_in_group > 0:
                    for theme in result:
                        # Percentage within this sentiment group
                        theme['percentage'] = round((theme['review_count'] / total_analyzed_in_group) * 100, 2)
                        
                        # Project to full dataset if total_records provided
                        if total_records and total_records > 0:
                            # Estimated count in full dataset
                            theme['estimated_total_count'] = round((theme['percentage'] / 100) * total_records)
                else:
                    for theme in result:
                        theme['percentage'] = 0.0
                        if total_records:
                            theme['estimated_total_count'] = 0
            
            # Sort by weighted_score descending
            result.sort(key=lambda x: x['weighted_score'], reverse=True)
            
            return result
        
        # Check structure and aggregate accordingly
        if isinstance(theme_data, dict):
            # Sentiment-split structure - aggregate each sentiment separately
            # CRITICAL: Keep sentiment boundaries - do NOT mix positive/neutral/negative
            result = {}
            for sentiment_key in ['positive_themes', 'neutral_themes', 'negative_themes']:
                if sentiment_key in theme_data:
                    result[sentiment_key] = aggregate_theme_list(
                        theme_data[sentiment_key],
                        total_records=total_records
                    )
            
            # Preserve the 'type' field if it exists
            if 'type' in theme_data:
                result['type'] = theme_data['type']
                
            return result
        else:
            # Flat list - aggregate all together
            return aggregate_theme_list(theme_data, total_records=total_records)
    
    def _aggregate_insights(self, insight_data: Dict[str, Any]) -> Dict[str, List[str]]:
        """
        Aggregate insights from multiple executions.
        Maintains category boundaries - NEVER aggregates across categories.
        
        Args:
            insight_data: Dictionary containing insights by category
            
        Returns:
            Aggregated insights by category (no cross-category mixing)
        """
        aggregated = {}
        
        # Process each category independently
        if isinstance(insight_data, dict):
            for category, insights in insight_data.items():
                if category not in aggregated:
                    aggregated[category] = []
                
                # Handle list of insights
                if isinstance(insights, list):
                    aggregated[category].extend(insights)
                elif isinstance(insights, dict):
                    # If insights are nested, flatten them but keep within category
                    for sub_insights in insights.values():
                        if isinstance(sub_insights, list):
                            aggregated[category].extend(sub_insights)
        
        # Deduplicate insights WITHIN each category while preserving order
        for category in aggregated:
            seen = set()
            deduplicated = []
            for insight in aggregated[category]:
                if not isinstance(insight, str):
                    continue
                
                # Normalize for comparison (strip whitespace, lowercase)
                normalized = insight.strip().lower()
                if normalized not in seen and normalized:
                    seen.add(normalized)
                    deduplicated.append(insight.strip())  # Keep original casing
            
            # DO NOT LIMIT - keep all unique insights
            aggregated[category] = deduplicated
        
        return aggregated
    
    def _aggregate_sentiment_stats(self, sentiment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Aggregate sentiment statistics from multiple executions.
        
        Args:
            sentiment_data: Dictionary containing sentiment counts and percentages
            
        Returns:
            Aggregated sentiment statistics with recalculated percentages
        """
        aggregated = {
            'positive': 0,
            'neutral': 0,
            'negative': 0,
            'total': 0
        }
        
        # Sum up counts
        for sentiment in ['positive', 'neutral', 'negative']:
            aggregated[sentiment] = sentiment_data.get(sentiment, 0)
        
        aggregated['total'] = sum(aggregated[s] for s in ['positive', 'neutral', 'negative'])
        
        # Recalculate percentages
        if aggregated['total'] > 0:
            aggregated['percentages'] = {
                sentiment: round((aggregated[sentiment] / aggregated['total']) * 100, 2)
                for sentiment in ['positive', 'neutral', 'negative']
            }
        else:
            aggregated['percentages'] = {
                'positive': 0.0,
                'neutral': 0.0,
                'negative': 0.0
            }
        
        # Determine dominant sentiment
        if aggregated['total'] > 0:
            aggregated['dominant_sentiment'] = max(
                ['positive', 'neutral', 'negative'],
                key=lambda s: aggregated[s]
            )
        else:
            aggregated['dominant_sentiment'] = None
        
        return aggregated
    
    # ============================================================
    # DATA AVAILABILITY CHECK
    # ============================================================
    
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
        theme_analysis = data.get('theme_analysis')
        return {
            'has_records': len(data.get('records', [])) > 0,
            'has_sentiment': bool(data.get('sentiment_statistics')),
            'has_insights': bool(data.get('insights')),
            'has_themes': bool(theme_analysis) and (isinstance(theme_analysis, list) or isinstance(theme_analysis, dict))
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
        step: Optional[int] = None,
        total_steps: Optional[int] = None,
        language: Literal['en','de'] = 'en'
    ) -> ExecutiveSummarySection:
        """
        Generate executive summary using LLM
        
        Summarizes all available data into key takeaways
        """
        records = data.get('records', [])
        
        if not availability.get('has_records'):
            return ExecutiveSummarySection(
                available=False,
                message='No data available for summary',
                content=None
            )
        
        try:
            # Build context for LLM
            context = self._build_summary_context(data, availability)
            
            requested_lang = 'English' if language == 'en' else 'German'
    

            # Generate summary using LLM
            system_prompt = f"""REPLY IN {requested_lang}!
ROLE: You are a senior data analyst creating executive summaries.
Generate a concise, professional summary (3-5 bullet points) highlighting the key findings.
Focus on actionable insights and important patterns."""
            
            user_prompt = f"""Analyze this review data and provide a professional, precise and concise executive summary:

{context}

Provide 3-5 key takeaways as bullet points in a JSON array format.
Example: ["Key finding 1", "Key finding 2", "Key finding 3"]"""
            
            await self._send_tool_update(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,                
                progress=20,
                message=f"{self.name} calling LLM for executive summary.",
                details={
                    'records_cnt': len(records)
                },
                status='LLM_handoff'
            )

            response = await self._call_llm(
                session_id=session_id,
                execution_id=execution_id,
                condition=condition,
                tool_name='show_results',
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=8192,
                parsed=True
            )
            
            # Handle response
            if isinstance(response, dict) and 'error' in response:
                raise ValueError(f"LLM error: {response['error']}")
            
            # Ensure response is a list
            if isinstance(response, str):
                summary = [response]
            elif isinstance(response, list):
                summary = response
            elif isinstance(response, dict):
                # Try to extract from dict if LLM returned unexpected format
                summary = list(response.values()) if response else ["Analysis completed"]
            else:
                summary = ["Analysis completed successfully"]
            
            # Build content
            content = ExecutiveSummaryContent(
                summary=summary,
                record_count=len(records),
                generated_at=time.strftime('%Y-%m-%d %H:%M:%S')
            )
            
            return ExecutiveSummarySection(
                available=True,
                content=content
            )
            
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
            
            return ExecutiveSummarySection(
                available=True,
                content=content
            )
    
    def _build_summary_context(
        self,
        data: Dict[str, Any],
        availability: Dict[str, bool]
    ) -> str:
        """Build context string for LLM summary with clear, readable formatting"""
        context_parts = []
        records = data.get('records', [])
        
        # === REVIEW COUNT ===
        context_parts.append(f"Dataset Overview:\n  Total Reviews Analyzed: {len(records)}")
        
        # === RATING STATISTICS ===
        ratings = [r.get('star_rating') for r in records if r.get('star_rating')]
        if ratings:
            avg_rating = sum(ratings) / len(ratings)
            rating_dist = Counter(ratings)
            rating_breakdown = ', '.join(f"{stars}★: {count}" for stars, count in sorted(rating_dist.items(), reverse=True))
            context_parts.append(
                f"\nRating Statistics:\n"
                f"  Average Rating: {avg_rating:.2f}/5.0\n"
                f"  Distribution: {rating_breakdown}"
            )
        
        # === SENTIMENT ANALYSIS ===
        if availability['has_sentiment']:
            sentiment_stats = data.get('sentiment_statistics', {})
            if sentiment_stats:
                context_parts.append(
                    f"\nSentiment Distribution:\n"
                    f"  Positive: {sentiment_stats.get('positive', 0)} ({sentiment_stats.get('percentages', {}).get('positive', 0):.1f}%)\n"
                    f"  Neutral: {sentiment_stats.get('neutral', 0)} ({sentiment_stats.get('percentages', {}).get('neutral', 0):.1f}%)\n"
                    f"  Negative: {sentiment_stats.get('negative', 0)} ({sentiment_stats.get('percentages', {}).get('negative', 0):.1f}%)\n"
                    f"  Dominant: {sentiment_stats.get('dominant_sentiment', 'N/A').capitalize()}"
                )
        
        # === THEMES BY SENTIMENT ===
        if availability['has_themes']:
            theme_analysis = data.get('theme_analysis', {})
            theme_sections = []
            themes_per_category = 3
            
            if isinstance(theme_analysis, dict):
                sentiment_categories = [
                    ('positive_themes', 'Positive'),
                    ('neutral_themes', 'Neutral'),
                    ('negative_themes', 'Negative')
                ]
                
                for sentiment_type, label in sentiment_categories:
                    theme_list = theme_analysis.get(sentiment_type, [])
                    if theme_list:
                        themes_formatted = []
                        for theme_obj in theme_list[:themes_per_category]:
                            if isinstance(theme_obj, dict):
                                theme_name = theme_obj.get('theme', '').replace('_', ' ').title()
                                percentage = theme_obj.get('percentage', 0)
                                weighted_score = theme_obj.get('weighted_score', 0)
                                review_count = theme_obj.get('review_count', 0)
                                estimated_total = theme_obj.get('estimated_total_count', '')
                                
                                base_info = f"    • {theme_name}: {percentage:.1f}% ({review_count} reviews, score: {weighted_score:.1f})"
                                if estimated_total:
                                    base_info += f" [~{estimated_total} in full dataset]"
                                themes_formatted.append(base_info)
                        
                        if themes_formatted:
                            theme_sections.append(f"  {label}:\n" + "\n".join(themes_formatted))
            
            if theme_sections:
                context_parts.append("\nMain Themes by Sentiment:\n" + "\n".join(theme_sections))
        
        # === KEY INSIGHTS ===
        if availability['has_insights']:
            insights_dict = data.get('insights', {})
            insights_formatted = []
            target_count = 6
            
            if insights_dict:
                categories = list(insights_dict.keys())
                num_categories = len(categories)
                
                if num_categories <= target_count:
                    # At least one per category, distribute remaining
                    insights_per_category = max(1, target_count // num_categories)
                    
                    for category in categories:
                        category_insights = insights_dict.get(category, [])
                        if category_insights:
                            category_label = category.replace('_', ' ').title()
                            insights_formatted.append(f"  {category_label}:")
                            for insight in category_insights[:insights_per_category]:
                                insights_formatted.append(f"    • {insight}")
                else:
                    # Take top insight from each category
                    for category in categories[:target_count]:
                        category_insights = insights_dict.get(category, [])
                        if category_insights:
                            category_label = category.replace('_', ' ').title()
                            insights_formatted.append(f"  {category_label}:")
                            insights_formatted.append(f"    • {category_insights[0]}")
                
                if insights_formatted:
                    context_parts.append("\nKey Business Insights:\n" + "\n".join(insights_formatted))
        
        return "\n".join(context_parts)
    
    def _generate_themes_section(
        self,
        data: Dict[str, Any],
        records: List[Dict[str, Any]],
        theme_analysis: Union[List[Dict], Dict],
        category: Literal['shoes', 'wireless'],
        availability: Dict[str, bool]
    ) -> ThemesSection:
        """
        Generate themes section
        
        Displays themes from sentiment analysis
        """
        if not availability['has_themes']:
            return ThemesSection(
                available=False,
                message='No theme analysis available',
                content=None
            )
        
        # Convert themes to ThemeStatistic objects
        theme_stats = []
        
        if isinstance(theme_analysis, dict):
            # Sentiment-split structure
            for sentiment_key in ['positive_themes', 'neutral_themes', 'negative_themes']:
                theme_list = theme_analysis.get(sentiment_key, [])
                sentiment_label = sentiment_key.replace('_themes', '')
                
                for theme_obj in theme_list:
                    if isinstance(theme_obj, dict):
                        theme_stats.append(ThemeStatistic(
                            theme=theme_obj.get('theme', ''),
                            sentiment=sentiment_label,
                            mention_count=theme_obj.get('review_count', 0),  # Fixed: use mention_count
                            percentage=theme_obj.get('percentage', 0.0),
                            weighted_score=theme_obj.get('weighted_score', 0.0),
                            estimated_total_count=theme_obj.get('estimated_total_count')
                        ))
        elif isinstance(theme_analysis, list):
            # Flat list structure
            for theme_obj in theme_analysis:
                if isinstance(theme_obj, dict):
                    theme_stats.append(ThemeStatistic(
                        theme=theme_obj.get('theme', ''),
                        sentiment=theme_obj.get('sentiment', 'unknown'),
                        mention_count=theme_obj.get('review_count', 0),  # Fixed: use mention_count
                        percentage=theme_obj.get('percentage', 0.0),
                        weighted_score=theme_obj.get('weighted_score', 0.0),
                        estimated_total_count=theme_obj.get('estimated_total_count')
                    ))
        
        content = ThemesContent(
            themes=theme_stats,
            total_themes=len(theme_stats),
            records_analyzed=len(records)
        )
        
        return ThemesSection(
            available=True,
            content=content
        )
    
    def _generate_recommendations_section(
        self,
        data: Dict[str, Any],
        records: List[Dict[str, Any]],
        insights: Dict[str, List[str]],
        availability: Dict[str, bool],
        language: Literal['en', 'de'] = 'en'
    ) -> RecommendationsSection:
        """
        Generate recommendations section
        
        Displays business insights as recommendations
        """
        if not availability['has_insights']:
            return RecommendationsSection(
                available=False,
                message='No insights available for recommendations',
                content=None
            )
        
        # Convert insights to Recommendation objects
        recommendations = []
        
        for category, insight_list in insights.items():
            for insight in insight_list:
                # Determine priority and impact based on insight content
                insight_lower = insight.lower()
                
                # Get language-specific keywords
                high_priority_keywords, low_priority_keywords = self._get_priority_keywords(language)
                high_impact_keywords, low_impact_keywords = self._get_impact_keywords(language)
                
                # Determine priority - how urgent/important is this action?
                high_priority_count = sum(1 for keyword in high_priority_keywords if keyword in insight_lower)
                low_priority_count = sum(1 for keyword in low_priority_keywords if keyword in insight_lower)
                
                if high_priority_count > low_priority_count:
                    priority = 'high'
                elif low_priority_count > high_priority_count:
                    priority = 'low'
                else:
                    priority = 'medium'
                
                # Determine impact - what's the potential effect/benefit?
                high_impact_count = sum(1 for keyword in high_impact_keywords if keyword in insight_lower)
                low_impact_count = sum(1 for keyword in low_impact_keywords if keyword in insight_lower)
                
                if high_impact_count > low_impact_count:
                    impact = 'high'
                elif low_impact_count > high_impact_count:
                    impact = 'low'
                else:
                    impact = 'medium'
                
                recommendations.append(Recommendation(
                    category=category,
                    recommendation=insight,
                    priority=priority,
                    impact=impact
                ))
        
        # --- Normalize labels per category when all are identical ---
        from collections import defaultdict

        # Group recommendation indexes by category
        by_category = defaultdict(list)
        for idx, rec in enumerate(recommendations):
            by_category[rec.category].append(idx)

        order = ["low", "medium", "high"]
        def bump(level: str) -> str:
            # raise one step; cap at "high"
            i = order.index(level)
            return order[min(i + 1, len(order) - 1)]

        for category, idx_list in by_category.items():
            if not idx_list:
                continue

            # Check both attributes independently
            for attr in ("priority", "impact"):
                levels = [getattr(recommendations[i], attr) for i in idx_list]
                unique = set(levels)
                if len(unique) == 1:
                    only = levels[0]
                    if only == "high":
                        # If all are high -> make LAST one low
                        last_idx = idx_list[-1]
                        setattr(recommendations[last_idx], attr, "medium")
                    else:
                        # If all are medium or all are low -> bump FIRST one up one level
                        first_idx = idx_list[0]
                        setattr(recommendations[first_idx], attr, bump(only))


        content = RecommendationsContent(
            recommendations=recommendations,
            total_recommendations=len(recommendations),
            high_priority_count=sum(1 for r in recommendations if r.priority == 'high'),
            generated_at=time.strftime('%Y-%m-%d %H:%M:%S')
        )
        
        return RecommendationsSection(
            available=True,
            content=content
        )
    
    def _generate_statistics_section(
        self,
        data: Dict[str, Any],
        sentiment_statistics: Dict[str, Any],
        availability: Dict[str, bool],
        category: Literal['shoes', 'wireless'],
        metrics: List[str],
        show_visualizations: bool = False
    ) -> StatisticsSection:
        """
        Generate statistics section
        
        Calculates requested metrics and optionally generates visualizations
        """
        if not availability['has_records']:
            return StatisticsSection(
                available=False,
                message='No data available for statistics',
                content=None
            )
        
        records = data.get('records', [])
        statistics = {}
        
        # Calculate requested metrics
        for metric in metrics:
            if metric == 'sentiment_distribution':
                if sentiment_statistics:
                    dist = SentimentDistribution(
                        available=True,
                        total_analyzed=int(sentiment_statistics.get('total', 0)),
                        distribution={
                            'positive': SentimentDistributionData(
                                count=int(sentiment_statistics.get('positive', 0)),
                                percentage=float(sentiment_statistics.get('percentages', {}).get('positive', 0.0))
                            ),
                            'neutral': SentimentDistributionData(
                                count=int(sentiment_statistics.get('neutral', 0)),
                                percentage=float(sentiment_statistics.get('percentages', {}).get('neutral', 0.0))
                            ),
                            'negative': SentimentDistributionData(
                                count=int(sentiment_statistics.get('negative', 0)),
                                percentage=float(sentiment_statistics.get('percentages', {}).get('negative', 0.0))
                            )
                        }
                    )
                else:
                    # Fallback when sentiment_statistics is None/missing
                    dist = SentimentDistribution(
                        available=False,
                        message='No sentiment analysis data available',
                        total_analyzed=0,
                        distribution={}
                    )

                statistics['sentiment_distribution'] = dist.model_dump(exclude_none=True)
            
            elif metric == 'review_summary':
                statistics['review_summary'] = self._calc_review_summary(records=records).model_dump(exclude_none=True)
            
            elif metric == 'rating_distribution':
                statistics['rating_distribution'] = self._calc_rating_distribution(records=records).model_dump(exclude_none=True)
            
            elif metric == 'verified_rate':
                statistics['verified_rate'] = self._calc_verified_rate(records=records).model_dump(exclude_none=True)
            
            elif metric == 'theme_coverage':
                statistics['theme_coverage'] = self._calc_theme_coverage(
                    records=records, 
                    category=category, 
                    availability=availability
                ).model_dump(exclude_none=True)
            
            elif metric == 'sentiment_consistency':
                statistics['sentiment_consistency'] = self._calc_sentiment_consistency(
                    records=records, 
                    availability=availability
                ).model_dump(exclude_none=True)
        
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
        
        return StatisticsSection(
            available=True,
            content=content
        )
    
    def _calc_review_summary(self, records: List[Dict[str, Any]]) -> ReviewSummary:
        """Calculate general review statistics"""
        return ReviewSummary(
            available=True,
            total_reviews=len(records),
            avg_review_body_length=sum(len(r.get('review_body', '')) for r in records) / len(records) if records else 0,
            avg_review_headline_length=sum(len(r.get('review_headline', '')) for r in records) / len(records) if records else 0,
            verified_count=sum(1 for r in records if r.get('verified_purchase')),
        )
    
    def _calc_rating_distribution(self, records: List[Dict[str, Any]]) -> RatingDistribution:
        """Calculate rating distribution statistics"""
        ratings = [r.get('star_rating') for r in records if r.get('star_rating')]
        
        if not ratings:
            return RatingDistribution(
                available=False,
                message='No rating data'
            )
        
        rating_counts = Counter(ratings)
        
        return RatingDistribution(
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
    
    def _calc_verified_rate(self, records: List[Dict[str, Any]]) -> VerifiedRate:
        """Calculate verified purchase rate"""
        total = len(records)
        verified = sum(1 for r in records if r.get('verified_purchase'))
        
        return VerifiedRate(
            available=True,
            total_reviews=total,
            verified_count=verified,
            verified_percentage=(verified / total * 100) if total > 0 else 0,
            non_verified_count=total - verified
        )
    
    def _calc_theme_coverage(
        self,
        records: List[Dict[str, Any]],
        category: Literal['shoes', 'wireless'],
        availability: Dict[str, bool]
    ) -> ThemeCoverage:
        """Calculate theme coverage statistics"""
        if not availability['has_themes']:
            return ThemeCoverage(
                available=False,
                message='No theme data'
            )
        
        # Theme coverage is calculated from theme_analysis data, not individual records
        # This metric would need to be passed from the aggregated theme_analysis
        return ThemeCoverage(
            available=True,
            total_themes_identified=0,
            top_themes=[],
            reviews_with_themes=len(records)
        )
    
    def _calc_sentiment_consistency(
        self,
        records: List[Dict[str, Any]],
        availability: Dict[str, bool]
    ) -> SentimentConsistency:
        """
        Calculate sentiment consistency
        
        Measures how well sentiment aligns with ratings
        """
        if not availability['has_sentiment']:
            return SentimentConsistency(
                available=False,
                message='No sentiment data'
            )
        
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
        
        return SentimentConsistency(
            available=True,
            total_compared=total,
            aligned_count=aligned,
            misaligned_count=misaligned,
            consistency_percentage=(aligned / total * 100) if total > 0 else 0,
            note='Measures alignment between star ratings and sentiment'
        )
    
    def _generate_data_preview_section(
        self,
        records: List[Dict[str, Any]],
        availability: Dict[str, bool],
        max_items: int
    ) -> DataPreviewSection:
        """
        Generate data preview section
        
        Shows sample of raw records
        """
        if not availability['has_records']:
            return DataPreviewSection(
                available=False,
                message='No data available for preview',
                content=None
            )
        
        # Limit to max_items
        preview_records = records[:max_items]
        
        content = DataPreviewContent(
            records=preview_records,
            total_records=len(records),
            preview_count=len(preview_records),
            showing_all=len(records) <= max_items
        )
        
        return DataPreviewSection(
            available=True,
            content=content
        )