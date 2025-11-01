# backend/app/orchestrator/tools/visualization_generator.py
"""
Visualization Generator for ShowResultsTool

Generates interactive charts using Plotly that can be:
1. Rendered directly in frontend via Plotly.js
2. Exported as static images (base64)
3. Saved as HTML for sharing

Chart Types:
- Rating distribution (bar chart)
- Sentiment distribution (pie chart)
- Rating vs Sentiment (grouped bar)
- Time series (if date data available)
- Top products (bar chart)
- Helpful votes distribution (histogram)
"""
from typing import Dict, Any, List, Optional, Tuple
import logging
from collections import Counter
from datetime import datetime

try:
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.subplots import make_subplots
    import plotly.io as pio
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False
    logging.warning("Plotly not installed. Visualizations will be disabled.")

logger = logging.getLogger(__name__)


class VisualizationGenerator:
    """
    Generate visualizations for review analysis results
    
    Features:
    - Automatic chart selection based on available data
    - Interactive Plotly charts (JSON format)
    - Consistent color schemes
    - Responsive sizing
    - Mobile-friendly
    """
    
    # Color schemes
    COLORS = {
        'positive': '#10B981',  # Green
        'neutral': '#F59E0B',   # Amber
        'negative': '#EF4444',  # Red
        'primary': '#3B82F6',   # Blue
        'secondary': '#8B5CF6', # Purple
        'gray': '#6B7280'       # Gray
    }
    
    RATING_COLORS = {
        5: '#10B981',  # Green
        4: '#84CC16',  # Lime
        3: '#F59E0B',  # Amber
        2: '#F97316',  # Orange
        1: '#EF4444'   # Red
    }
    
    def __init__(self):
        """Initialize visualization generator"""
        if not PLOTLY_AVAILABLE:
            logger.warning("Plotly not available - visualizations disabled")
        
        # Default layout settings
        self.default_layout = {
            'template': 'plotly_white',
            'font': {'family': 'Inter, system-ui, sans-serif', 'size': 12},
            'margin': {'l': 40, 'r': 40, 't': 40, 'b': 40},
            'height': 350,
            'paper_bgcolor': 'white',
            'plot_bgcolor': 'white'
        }
    
    def generate_all_visualizations(
        self,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate all applicable visualizations for the dataset
        
        Args:
            data: Working data with records and metadata
            
        Returns:
            Dictionary of visualizations with metadata:
            {
                'visualizations': [
                    {
                        'type': 'rating_distribution',
                        'title': 'Rating Distribution',
                        'plotly_json': {...},  # Plotly figure as JSON
                        'image_base64': '...',  # Optional static image
                        'description': 'Distribution of star ratings'
                    }
                ],
                'has_visualizations': True,
                'visualization_count': 3
            }
        """
        if not PLOTLY_AVAILABLE:
            return {
                'visualizations': [],
                'has_visualizations': False,
                'error': 'Plotly not installed'
            }
        
        records = data.get('records', [])
        if not records:
            return {
                'visualizations': [],
                'has_visualizations': False,
                'error': 'No data available'
            }
        
        visualizations = []
        
        # 1. Rating Distribution (always if ratings exist)
        if self._has_ratings(records):
            rating_viz = self._create_rating_distribution(records)
            if rating_viz:
                visualizations.append(rating_viz)
        
        # 2. Sentiment Distribution (if sentiment analyzed)
        if self._has_sentiment(records):
            sentiment_viz = self._create_sentiment_pie(records)
            if sentiment_viz:
                visualizations.append(sentiment_viz)
        
        # 3. Rating vs Sentiment (if both available)
        if self._has_ratings(records) and self._has_sentiment(records):
            comparison_viz = self._create_rating_sentiment_comparison(records)
            if comparison_viz:
                visualizations.append(comparison_viz)
        
        # 4. Top Products (if multiple products)
        if self._has_multiple_products(records):
            products_viz = self._create_top_products(records)
            if products_viz:
                visualizations.append(products_viz)
        
        # 5. Verified vs Non-Verified (if available)
        if self._has_verification_data(records):
            verified_viz = self._create_verification_comparison(records)
            if verified_viz:
                visualizations.append(verified_viz)
        
        logger.info(f"Generated {len(visualizations)} visualizations")
        
        return {
            'visualizations': visualizations,
            'has_visualizations': len(visualizations) > 0,
            'visualization_count': len(visualizations),
            'metadata': {
                'records_analyzed': len(records),
                'has_ratings': self._has_ratings(records),
                'has_sentiment': self._has_sentiment(records),
                'has_products': self._has_multiple_products(records)
            }
        }
    
    # ============================================================
    # VISUALIZATION CREATORS
    # ============================================================
    
    def _create_rating_distribution(
        self,
        records: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Create bar chart of rating distribution
        
        Shows count of reviews for each star rating (1-5)
        """
        try:
            # Count ratings
            ratings = [r.get('star_rating') for r in records if r.get('star_rating')]
            rating_counts = Counter(ratings)
            
            # Ensure all ratings 1-5 are represented
            x_values = [1, 2, 3, 4, 5]
            y_values = [rating_counts.get(r, 0) for r in x_values]
            
            # Create bar chart
            fig = go.Figure(data=[
                go.Bar(
                    x=x_values,
                    y=y_values,
                    marker_color=[self.RATING_COLORS.get(r, self.COLORS['gray']) for r in x_values],
                    text=y_values,
                    textposition='auto',
                    hovertemplate='<b>%{x} Stars</b><br>Count: %{y}<extra></extra>'
                )
            ])
            
            fig.update_layout(
                **self.default_layout,
                title='Rating Distribution',
                xaxis_title='Star Rating',
                yaxis_title='Number of Reviews',
                xaxis=dict(tickmode='linear', tick0=1, dtick=1),
                showlegend=False
            )
            
            return {
                'type': 'rating_distribution',
                'title': 'Rating Distribution',
                'description': f'Distribution of {len(ratings)} review ratings',
                'plotly_json': fig.to_dict(),
                'insights': self._generate_rating_insights(rating_counts, len(ratings))
            }
            
        except Exception as e:
            logger.error(f"Error creating rating distribution: {e}")
            return None
    
    def _create_sentiment_pie(
        self,
        records: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Create pie chart of sentiment distribution
        
        Shows proportion of positive/neutral/negative reviews
        """
        try:
            # Count sentiments
            sentiments = [r.get('sentiment', '').lower() for r in records if r.get('sentiment')]
            sentiment_counts = Counter(sentiments)
            
            if not sentiment_counts:
                return None
            
            labels = []
            values = []
            colors = []
            
            for sentiment in ['positive', 'neutral', 'negative']:
                if sentiment in sentiment_counts:
                    labels.append(sentiment.capitalize())
                    values.append(sentiment_counts[sentiment])
                    colors.append(self.COLORS.get(sentiment, self.COLORS['gray']))
            
            # Create pie chart
            fig = go.Figure(data=[
                go.Pie(
                    labels=labels,
                    values=values,
                    marker=dict(colors=colors),
                    hole=0.4,  # Donut chart
                    hovertemplate='<b>%{label}</b><br>%{value} reviews (%{percent})<extra></extra>'
                )
            ])
            
            fig.update_layout(
                **self.default_layout,
                title='Sentiment Distribution',
                showlegend=True,
                legend=dict(orientation='h', yanchor='bottom', y=-0.1, xanchor='center', x=0.5)
            )
            
            return {
                'type': 'sentiment_distribution',
                'title': 'Sentiment Distribution',
                'description': f'Sentiment analysis of {len(sentiments)} reviews',
                'plotly_json': fig.to_dict(),
                'insights': self._generate_sentiment_insights(sentiment_counts, len(sentiments))
            }
            
        except Exception as e:
            logger.error(f"Error creating sentiment pie: {e}")
            return None
    
    def _create_rating_sentiment_comparison(
        self,
        records: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Create grouped bar chart comparing ratings and sentiment
        
        Shows how sentiment aligns with star ratings
        """
        try:
            # Organize data: rating -> sentiment -> count
            rating_sentiment = {}
            
            for record in records:
                rating = record.get('star_rating')
                sentiment = record.get('sentiment', '').lower()
                
                if rating and sentiment:
                    if rating not in rating_sentiment:
                        rating_sentiment[rating] = Counter()
                    rating_sentiment[rating][sentiment] += 1
            
            if not rating_sentiment:
                return None
            
            # Prepare data for grouped bar chart
            ratings = sorted(rating_sentiment.keys())
            
            positive_counts = [rating_sentiment[r].get('positive', 0) for r in ratings]
            neutral_counts = [rating_sentiment[r].get('neutral', 0) for r in ratings]
            negative_counts = [rating_sentiment[r].get('negative', 0) for r in ratings]
            
            # Create figure
            fig = go.Figure()
            
            fig.add_trace(go.Bar(
                name='Positive',
                x=ratings,
                y=positive_counts,
                marker_color=self.COLORS['positive'],
                hovertemplate='<b>%{x} Stars - Positive</b><br>Count: %{y}<extra></extra>'
            ))
            
            fig.add_trace(go.Bar(
                name='Neutral',
                x=ratings,
                y=neutral_counts,
                marker_color=self.COLORS['neutral'],
                hovertemplate='<b>%{x} Stars - Neutral</b><br>Count: %{y}<extra></extra>'
            ))
            
            fig.add_trace(go.Bar(
                name='Negative',
                x=ratings,
                y=negative_counts,
                marker_color=self.COLORS['negative'],
                hovertemplate='<b>%{x} Stars - Negative</b><br>Count: %{y}<extra></extra>'
            ))
            
            fig.update_layout(
                **self.default_layout,
                title='Sentiment by Rating',
                xaxis_title='Star Rating',
                yaxis_title='Number of Reviews',
                xaxis=dict(tickmode='linear', tick0=1, dtick=1),
                barmode='stack',
                legend=dict(orientation='h', yanchor='bottom', y=-0.2, xanchor='center', x=0.5)
            )
            
            return {
                'type': 'rating_sentiment_comparison',
                'title': 'Sentiment by Rating',
                'description': 'How sentiment aligns with star ratings',
                'plotly_json': fig.to_dict(),
                'insights': self._generate_alignment_insights(rating_sentiment)
            }
            
        except Exception as e:
            logger.error(f"Error creating rating/sentiment comparison: {e}")
            return None
    
    def _create_top_products(
        self,
        records: List[Dict[str, Any]],
        top_n: int = 10
    ) -> Optional[Dict[str, Any]]:
        """
        Create horizontal bar chart of top products by review count
        """
        try:
            # Count reviews per product
            products = [r.get('product_title', 'Unknown') for r in records if r.get('product_title')]
            product_counts = Counter(products).most_common(top_n)
            
            if not product_counts or len(product_counts) < 2:
                return None  # Need at least 2 products
            
            # Truncate long product names
            names = [self._truncate_text(p[0], 40) for p in product_counts]
            counts = [p[1] for p in product_counts]
            
            # Create horizontal bar chart
            fig = go.Figure(data=[
                go.Bar(
                    y=names[::-1],  # Reverse for top-to-bottom display
                    x=counts[::-1],
                    orientation='h',
                    marker_color=self.COLORS['primary'],
                    text=counts[::-1],
                    textposition='auto',
                    hovertemplate='<b>%{y}</b><br>Reviews: %{x}<extra></extra>'
                )
            ])
            
            fig.update_layout(
                **self.default_layout,
                title=f'Top {min(top_n, len(product_counts))} Products by Review Count',
                xaxis_title='Number of Reviews',
                yaxis_title='',
                height=max(350, len(product_counts) * 35),  # Dynamic height
                showlegend=False
            )
            
            return {
                'type': 'top_products',
                'title': 'Top Products',
                'description': f'Top {len(product_counts)} products by review volume',
                'plotly_json': fig.to_dict()
            }
            
        except Exception as e:
            logger.error(f"Error creating top products chart: {e}")
            return None
    
    def _create_verification_comparison(
        self,
        records: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Create comparison of verified vs non-verified purchases
        """
        try:
            verified = sum(1 for r in records if r.get('verified_purchase'))
            non_verified = len(records) - verified
            
            if verified == 0 or non_verified == 0:
                return None  # Only show if both categories exist
            
            # Average ratings for each category
            verified_ratings = [r.get('star_rating') for r in records 
                              if r.get('verified_purchase') and r.get('star_rating')]
            non_verified_ratings = [r.get('star_rating') for r in records 
                                   if not r.get('verified_purchase') and r.get('star_rating')]
            
            avg_verified = sum(verified_ratings) / len(verified_ratings) if verified_ratings else 0
            avg_non_verified = sum(non_verified_ratings) / len(non_verified_ratings) if non_verified_ratings else 0
            
            # Create grouped bar chart
            fig = go.Figure()
            
            fig.add_trace(go.Bar(
                name='Count',
                x=['Verified', 'Non-Verified'],
                y=[verified, non_verified],
                marker_color=[self.COLORS['positive'], self.COLORS['gray']],
                text=[verified, non_verified],
                textposition='auto',
                yaxis='y',
                hovertemplate='<b>%{x}</b><br>Count: %{y}<extra></extra>'
            ))
            
            fig.add_trace(go.Scatter(
                name='Avg Rating',
                x=['Verified', 'Non-Verified'],
                y=[avg_verified, avg_non_verified],
                mode='lines+markers+text',
                marker=dict(size=12, color=self.COLORS['secondary']),
                line=dict(width=3, color=self.COLORS['secondary']),
                text=[f'{avg_verified:.2f}★', f'{avg_non_verified:.2f}★'],
                textposition='top center',
                yaxis='y2',
                hovertemplate='<b>%{x}</b><br>Avg Rating: %{y:.2f}<extra></extra>'
            ))
            
            fig.update_layout(
                **self.default_layout,
                title='Verified vs Non-Verified Purchases',
                xaxis_title='',
                yaxis=dict(title='Review Count', side='left'),
                yaxis2=dict(
                    title='Average Rating',
                    overlaying='y',
                    side='right',
                    range=[0, 5],
                    showgrid=False
                ),
                legend=dict(orientation='h', yanchor='bottom', y=-0.2, xanchor='center', x=0.5)
            )
            
            return {
                'type': 'verification_comparison',
                'title': 'Verified vs Non-Verified',
                'description': 'Comparison of verified and non-verified purchase reviews',
                'plotly_json': fig.to_dict(),
                'insights': [
                    f'{verified} verified purchases ({verified/len(records)*100:.1f}%)',
                    f'Verified avg rating: {avg_verified:.2f}★',
                    f'Non-verified avg rating: {avg_non_verified:.2f}★'
                ]
            }
            
        except Exception as e:
            logger.error(f"Error creating verification comparison: {e}")
            return None
    
    # ============================================================
    # HELPER METHODS
    # ============================================================
    
    def _has_ratings(self, records: List[Dict[str, Any]]) -> bool:
        """Check if records have rating data"""
        return any(r.get('star_rating') for r in records)
    
    def _has_sentiment(self, records: List[Dict[str, Any]]) -> bool:
        """Check if records have sentiment data"""
        return any(r.get('sentiment') for r in records)
    
    def _has_multiple_products(self, records: List[Dict[str, Any]]) -> bool:
        """Check if dataset has multiple products"""
        products = list(r.get('product_id') for r in records if r.get('product_id'))
        return len(products) > 1
    
    def _has_verification_data(self, records: List[Dict[str, Any]]) -> bool:
        """Check if records have verification data"""
        has_verified = any(r.get('verified_purchase') for r in records)
        has_non_verified = any(not r.get('verified_purchase') for r in records)
        return has_verified and has_non_verified
    
    def _truncate_text(self, text: str, max_length: int) -> str:
        """Truncate text to max length with ellipsis"""
        if len(text) <= max_length:
            return text
        return text[:max_length-3] + '...'
    
    def _generate_rating_insights(
        self,
        rating_counts: Counter,
        total: int
    ) -> List[str]:
        """Generate insights from rating distribution"""
        insights = []
        
        # Average rating
        weighted_sum = sum(rating * count for rating, count in rating_counts.items())
        avg_rating = weighted_sum / total if total > 0 else 0
        insights.append(f'Average rating: {avg_rating:.2f}★')
        
        # Most common rating
        if rating_counts:
            most_common = rating_counts.most_common(1)[0]
            insights.append(f'Most common: {most_common[0]}★ ({most_common[1]} reviews)')
        
        # Satisfaction metric (4-5 stars)
        high_ratings = rating_counts.get(5, 0) + rating_counts.get(4, 0)
        satisfaction_pct = (high_ratings / total * 100) if total > 0 else 0
        insights.append(f'{satisfaction_pct:.1f}% rated 4-5 stars')
        
        return insights
    
    def _generate_sentiment_insights(
        self,
        sentiment_counts: Counter,
        total: int
    ) -> List[str]:
        """Generate insights from sentiment distribution"""
        insights = []
        
        for sentiment in ['positive', 'neutral', 'negative']:
            count = sentiment_counts.get(sentiment, 0)
            pct = (count / total * 100) if total > 0 else 0
            insights.append(f'{sentiment.capitalize()}: {pct:.1f}% ({count} reviews)')
        
        return insights
    
    def _generate_alignment_insights(
        self,
        rating_sentiment: Dict[int, Counter]
    ) -> List[str]:
        """Generate insights about rating/sentiment alignment"""
        insights = []
        
        # Check for misalignment (high rating with negative sentiment)
        for rating in [4, 5]:
            if rating in rating_sentiment:
                negative = rating_sentiment[rating].get('negative', 0)
                total = sum(rating_sentiment[rating].values())
                if total > 0 and (negative / total) > 0.2:
                    insights.append(
                        f'{rating}★ reviews have {negative/total*100:.0f}% negative sentiment'
                    )
        
        return insights