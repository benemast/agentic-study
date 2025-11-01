# backend/app/orchestrator/tools/registry.py
"""
Centralized Tool Registry - Single Source of Truth for All Tools

This registry serves as the ONLY place where tools are defined.
Both WorkflowBuilderGraph and AIAssistantGraph use this registry.

Adding a new tool:
1. Create tool class in data_tools.py or analysis_tools.py
2. (Optional) Create parameter schema in llm/tool_schemas.py
3. Add one entry to TOOL_DEFINITIONS below
4. Done! Tool is now available in both conditions.
"""
from typing import Dict, Any, Type, Optional, List, Literal
from enum import Enum
import logging

from .data_tools import (
    BaseTool,
    LoadReviewsTool,
    FilterReviewsTool,
    SortReviewsTool,
    DataCleanerTool
)
from .analysis_tools import (
    ReviewSentimentAnalysisTool,
    GenerateInsightsTool
)

from .show_results_tool import ShowResultsTool

logger = logging.getLogger(__name__)

# Type alias for verbosity levels
VerbosityLevel = Literal["brief", "standard", "full"]


class ToolPosition(str, Enum):
    """Tool position constraints"""
    FIRST = "first"      # Must be first tool (e.g. LoadReviews)
    LAST = "last"        # Must be last tool (e.g. ShowResults)
    MIDDLE = "middle"    # Can be anywhere in middle
    ANY = "any"          # No position constraint
    NONE = "none"        # Do not consider this tool!


class ToolDefinition:
    """
    Complete definition of a tool with all its metadata
    
    This contains everything needed to use the tool in both conditions.
    Supports tiered descriptions for token optimization.
    """
    
    def __init__(
        self,
        tool_class: Type[BaseTool],
        workflow_id: str,
        ai_id: str,
        display_name: str,
        description: str,
        category: str,
        requires_data: bool = False,
        parameter_schema_name: Optional[str] = None,
        position_constraint: ToolPosition = ToolPosition.MIDDLE,
        # LLM Guidance Fields
        prerequisites: Optional[List[str]] = None,
        estimated_time: Optional[str] = None,
        optimal_dataset_size: Optional[str] = None,
        when_to_use: Optional[str] = None,
        when_not_to_use: Optional[str] = None,
    ):
        """
        Define a tool with all its metadata
        
        Args:
            tool_class: The tool class (e.g., LoadReviewsTool)
            workflow_id: ID used in Workflow Builder frontend (e.g., 'load-reviews')
            ai_id: ID used by AI Assistant (e.g., 'load_reviews')
            display_name: Human-readable name (e.g., 'Load Reviews')
            description: What the tool does and how it works
            category: Tool category ('input', 'data', 'analysis', 'output')
            requires_data: Whether tool needs existing data to run
            parameter_schema_name: Name of Pydantic schema in tool_schemas.py
            position_constraint: Where tool can be placed in workflow
            prerequisites: List of tool IDs that must run before this tool
            estimated_time: Processing time estimate (e.g., '1-3 seconds per 100 reviews')
            optimal_dataset_size: Recommended data volume (e.g., '100-5000 reviews')
            when_to_use: Explicit guidance on appropriate use cases
            when_not_to_use: Explicit warnings about inappropriate usage
        """
        self.tool_class = tool_class
        self.workflow_id = workflow_id
        self.ai_id = ai_id
        self.display_name = display_name
        self.description = description
        self.category = category
        self.requires_data = requires_data
        self.parameter_schema_name = parameter_schema_name
        self.position_constraint = position_constraint
        
        # Enhanced LLM Guidance
        self.prerequisites = prerequisites or []
        self.estimated_time = estimated_time
        self.optimal_dataset_size = optimal_dataset_size
        self.when_to_use = when_to_use
        self.when_not_to_use = when_not_to_use
        
        # Create single instance (singleton per tool type)
        self._instance = None
    
    @property
    def instance(self) -> BaseTool:
        """Get singleton instance of the tool"""
        if self._instance is None:
            self._instance = self.tool_class()
        return self._instance
    
    @property
    def is_required_first(self) -> bool:
        """Check if tool must be first"""
        return self.position_constraint == ToolPosition.FIRST
    
    @property
    def is_required_last(self) -> bool:
        """Check if tool must be last"""
        return self.position_constraint == ToolPosition.LAST
    
    @property
    def has_prerequisites(self) -> bool:
        """Check if tool has prerequisites"""
        return len(self.prerequisites) > 0

    # ==================== TIERED DESCRIPTIONS ====================
    
    def get_brief_description(self) -> str:
        """
        Brief description for tool listing/filtering
        
        Token cost: ~20 tokens per tool
        Use for: Simple workflows, tool browsing, initial filtering
        
        Returns: First sentence of main description only
        """
        # Extract first sentence (up to first period)
        first_sentence = self.description.split('. ')[0]
        if not first_sentence.endswith('.'):
            first_sentence += '.'
        return first_sentence
    
    def get_standard_description(self) -> str:
        """
        Standard description with core info and use cases
        
        Token cost: ~100 tokens per tool
        Use for: Most workflows, standard operations, moderate complexity
        
        Returns: Main description + when_to_use/when_not_to_use
        """
        parts = [self.description]
        
        if self.when_to_use:
            # Truncate to first 150 chars if too long
            use_case = self.when_to_use
            if len(use_case) > 150:
                use_case = use_case[:147] + "..."
            parts.append(f"USE WHEN: {use_case}")
        
        if self.when_not_to_use:
            # Truncate to first 100 chars if too long
            avoid_case = self.when_not_to_use
            if len(avoid_case) > 100:
                avoid_case = avoid_case[:97] + "..."
            parts.append(f"AVOID WHEN: {avoid_case}")
        
        return " ".join(parts)
    
    def get_full_description(self) -> str:
        """
        Complete description with all metadata
        
        Token cost: ~250 tokens per tool
        Use for: Complex decisions, error recovery, ambiguous requests
        
        Returns: Everything including prerequisites, timing, dataset sizes
        """
        parts = [self.description]
        
        if self.when_to_use:
            parts.append(f"USE WHEN: {self.when_to_use}")
        
        if self.when_not_to_use:
            parts.append(f"DO NOT USE WHEN: {self.when_not_to_use}")
        
        if self.prerequisites:
            prereq_names = ', '.join(self.prerequisites)
            parts.append(f"PREREQUISITES: Requires {prereq_names} to have been executed first.")
        
        if self.optimal_dataset_size:
            parts.append(f"OPTIMAL DATA: {self.optimal_dataset_size}")
        
        if self.estimated_time:
            parts.append(f"PROCESSING TIME: {self.estimated_time}")
        
        return " ".join(parts)
    
    def get_contextual_description(
        self, 
        state: Dict[str, Any],
        max_length: Optional[int] = None
    ) -> str:
        """
        Context-aware description based on current workflow state
        
        Dynamically includes only relevant information:
        - Prerequisites only if not yet met
        - Data requirements only if relevant
        - Timing info only for expensive operations
        
        Args:
            state: Current workflow state
            max_length: Optional character limit for truncation
            
        Returns: Contextually optimized description
        """
        parts = [self.description]
        
        # Check state
        has_data = bool(state.get('working_data', {}).get('records'))
        executed_tools = state.get('executed_tools', [])
        
        # Only show "when to use" if tool is actually available
        if not self.requires_data or has_data:
            if self.when_to_use:
                use_case = self.when_to_use[:120] + "..." if len(self.when_to_use) > 120 else self.when_to_use
                parts.append(f"USE: {use_case}")
        
        # Only show prerequisites if they're not yet met
        if self.prerequisites:
            missing = [p for p in self.prerequisites if p not in executed_tools]
            if missing:
                parts.append(f"REQUIRES: {', '.join(missing)} first")
        
        # Show timing for expensive operations (AI tools)
        if self.category == 'analysis' and self.estimated_time:
            parts.append(f"TIME: {self.estimated_time}")
        
        description = " ".join(parts)
        
        # Apply max length if specified
        if max_length and len(description) > max_length:
            description = description[:max_length - 3] + "..."
        
        return description

    def to_dict(self) -> Dict[str, Any]:
        """Export tool metadata as dict"""
        return {
            'workflow_id': self.workflow_id,
            'ai_id': self.ai_id,
            'display_name': self.display_name,
            'description': self.description,
            'category': self.category,
            'requires_data': self.requires_data,
            'has_parameters': self.parameter_schema_name is not None,
            'position_constraint': self.position_constraint.value,
            # Enhanced fields
            'prerequisites': self.prerequisites,
            'has_prerequisites': self.has_prerequisites,
            'estimated_time': self.estimated_time,
            'optimal_dataset_size': self.optimal_dataset_size,
            'when_to_use': self.when_to_use,
            'when_not_to_use': self.when_not_to_use,
        }


# ============================================================
# TOOL DEFINITIONS - SINGLE SOURCE OF TRUTH
# ============================================================

TOOL_DEFINITIONS = [
    # ============================================================
    # INPUT TOOLS
    # ============================================================
    ToolDefinition(
        tool_class=LoadReviewsTool,
        workflow_id='load-reviews',
        ai_id='load_reviews',
        display_name='Load Product Reviews',
        description=(
            "Retrieves customer review data from the database as the starting point for analysis. "
            "Loads reviews from either 'shoes' (5 products, ~2k reviews) or 'wireless' headphones "
            "(6 products, ~2k reviews) category. Returns structured review data including ratings, "
            "review text, verified purchase status, helpful votes, and product metadata. "
            "Supports optional pre-filtering by star rating (1-5), verified purchase status (true/false), "
            "and result limits for performance optimization."
        ),
        category='input',
        requires_data=False,
        parameter_schema_name='LoadReviewsParams',
        position_constraint=ToolPosition.FIRST,
        # LLM Guidance Fields
        prerequisites=[],
        estimated_time='<1 second for up to 10,000 reviews',
        optimal_dataset_size='about 500 reviews for balanced performance and single product analysis, around 2 for comprehensive analysis',
        when_to_use=(
            "Use as the FIRST tool to begin any review analysis workflow. "
            "Essential when starting fresh analysis and need to access customer review data. "
            "Required before any filtering, sorting, cleaning, or AI analysis operations."
        ),
        when_not_to_use=(
            "Do NOT use if you are already working with loaded data from previous steps. "
            "Do NOT use in the middle or end of a workflow - this is strictly a starting tool. "
            "Do NOT use if you need to combine or merge data from multiple sources."
        )
    ),
    
    # ============================================================
    # DATA PROCESSING TOOLS
    # ============================================================
    ToolDefinition(
        tool_class=FilterReviewsTool,
        workflow_id='filter-reviews',
        ai_id='filter_reviews',
        display_name='Filter Reviews',
        description=(
            "Filters existing review dataset to narrow down to relevant entries based on specific criteria. "
            "Supports filtering by: Product ID or Name (exact/contains), Star rating with comparison operators "
            "(equals, >=, <=, e.g. '>=4' for positive reviews), Text content search (contains keywords), "
            "Verified purchase status (true/false), and Helpfulness scores (number of helpful votes). "
            "Any other column from the dataset retrieved from load_reviews can be used to filter. "
            "Multiple filters can be combined for precise targeting."
        ),
        category='data',
        requires_data=True,
        parameter_schema_name='FilterReviewsParams',
        position_constraint=ToolPosition.MIDDLE,
        # LLM Guidance Fields
        prerequisites=['load_reviews'],
        estimated_time='<1 second for most filter operations',
        optimal_dataset_size='Works with any size, but results should maintain 50-100+ reviews for statistical significance',
        when_to_use=(
            "Use AFTER loading reviews when you need to analyze specific segments: "
            "(1) Specific product (e.g., one product ID) to focus on one product, "
            "(2) Low-rated reviews (e.g., 1-2 stars) to identify pain points, "
            "(3) High-rated reviews (e.g., 4-5 stars) to find strengths, "
            "(4) Verified purchases only for authentic customer opinions, "
            "(5) Reviews mentioning specific keywords (e.g., 'comfortable', 'battery') to analyze specific features, "
        ),
        when_not_to_use=(
            "Do NOT over-filter - avoid reducing dataset below 50-100 reviews as this reduces statistical significance. "
            "Do NOT use as first tool - requires data to be loaded first. "
            "Do NOT use if you simply need to reorder data (use sort_reviews instead)."
            "Do NOT use if you need comprehensive analysis across all reviews without exclusions. "
        )
    ),

    ToolDefinition(
        tool_class=SortReviewsTool,
        workflow_id='sort-reviews',
        ai_id='sort_reviews',
        display_name='Sort Reviews',
        description=(
            "Arranges reviews in ascending or descending order based on selected column to prioritize most relevant data. "
            "Does NOT filter or reduce dataset size, only changes display order."
            "Supports sorting by: Product ID, Product Title, Star rating (1-5), Review Headline, Review Body, Helpfulness votes or Total engagement votes. "
            "Directions: Descending (high→low, newest→oldest) or Ascending (low→high, oldest→newest). "
        ),
        category='data',
        requires_data=True,
        parameter_schema_name='SortReviewsParams',
        position_constraint=ToolPosition.MIDDLE,
        # LLM Guidance Fields
        prerequisites=['load_reviews'],
        estimated_time='<1 second for most datasets',
        optimal_dataset_size='Works efficiently with any dataset size',
        when_to_use=(
            "Use when order matters for analysis or presentation: "
            "(1) Prioritize most critical feedback (sort low ratings first), "
            "(2) Show most helpful reviews first (sort by helpful votes descending), "
            "(3) Analyze temporal trends (sort by date ascending for chronological, descending for recent-first), "
            "(4) Focus on highly engaged reviews (sort by total votes). "
            "Can be combined with filtering (e.g., filter to 1-2 stars, then sort by helpfulness)."
        ),
        when_not_to_use=(
            "Do NOT use if order is irrelevant to your analysis task. "
            "Do NOT use if you need to filter/reduce data - sorting doesn't remove any records. "
            "Do NOT confuse with filtering - sorting rearranges, filtering removes. "
            "Do NOT use as first tool - requires data to be loaded first."
        )
    ),
    
    ToolDefinition(
        tool_class=DataCleanerTool,
        workflow_id='clean-data',
        ai_id='clean_data',
        display_name='Clean Data',
        description=(
            "Improves data quality by automatically detecting and removing problematic review entries. "
            "Performs intelligent cleaning: (1) Spam detection and removal, (2) Duplicate detection and removal, "
            "(3) Malformed data removal (missing critical fields), (4) Low-quality content filtering "
            "(extremely short reviews, excessive special characters, non-meaningful content). "
            "Warning: May reduce dataset size by 5-20% depending on original data quality."
        ),
        category='data',
        requires_data=True,
        parameter_schema_name='CleanDataParams',
        position_constraint=ToolPosition.MIDDLE,
        # LLM Guidance Fields
        prerequisites=['load_reviews'],
        estimated_time='1-2 seconds per 1,000 reviews',
        optimal_dataset_size='Beneficial with any size dataset, as data quality issues are common',
        when_to_use=(
            "Use AFTER loading reviews and BEFORE AI analysis (sentiment analysis, insights generation). "
            "Essential when: (1) Data quality impacts analysis accuracy, "
            "(2) Dataset contains spam, promotional content, or fake reviews, "
            "(3) Preparing data for sentiment analysis or theme extraction (AI tools are sensitive to noise), "
            "(4) Dataset has duplicates that would skew statistical results, "
            "(5) Many reviews have missing or malformed data fields."
        ),
        when_not_to_use=(
            "Do NOT use if dataset is already small (<100 reviews) and further reduction would harm analysis. "            
            "Do NOT use if you need to preserve ALL records for statistical completeness (e.g., analyzing spam patterns themselves). "
            "Do NOT use as first tool - requires data to be loaded first."
        )
    ),
    
    # ============================================================
    # ANALYSIS TOOLS
    # ============================================================
    ToolDefinition(
        tool_class=ReviewSentimentAnalysisTool,
        workflow_id='review-sentiment-analysis',
        ai_id='review_sentiment_analysis',
        display_name='Analyze Review Sentiment',
        description=(
            "Performs AI-powered sentiment analysis and theme extraction from review text to understand customer opinions at scale. "
            "Analyzes: (1) Sentiment classification (positive/negative/neutral with confidence scores), "
            "(2) Theme extraction (comfort, durability, price, battery, sound quality, fit, value), "
            "(3) Sentiment distribution percentages, (4) Theme-level sentiment (how customers feel about each topic), "
            "(5) Pain point detection (most mentioned negative themes). "
            "Returns structured data with themes, frequencies, sentiment breakdowns, and key insights."
        ),
        category='analysis',
        requires_data=True,
        parameter_schema_name='ReviewSentimentAnalysisParams',
        position_constraint=ToolPosition.MIDDLE,
        # LLM Guidance Fields
        prerequisites=['filter_reviews','clean_data'],
        estimated_time='1-3 seconds per 100 reviews (AI processing)',
        optimal_dataset_size='100+ reviews minimum for patterns, 300-500 reviews optimal for statistical significance',
        when_to_use=(
            "Use AFTER data loading, cleaning and filtering when you need to understand: "
            "(1) WHAT topics customers are discussing (themes), "
            "(2) HOW customers feel about products and specific features (sentiment), "
            "(3) Which issues are mentioned most frequently (pain points), "
            "(4) Overall sentiment distribution across reviews. "
            "REQUIRED as a prerequisite before generating business insights. "
            "Best for: Product managers understanding feedback, marketers identifying messaging angles, "
            "product teams prioritizing improvements."
        ),
        when_not_to_use=(
            "Do NOT use if you only need numerical statistics like rating distributions (use filter/sort instead). "
            "Do NOT use with <50 reviews - insufficient data for meaningful pattern detection. "
            "Do NOT use if reviews lack substantial text content (short reviews with just ratings). "
            "Do NOT use as first tool - requires data to be loaded first. "
            "Do NOT use if you need strategic recommendations (use generate_insights after this)."
        )
    ),

    ToolDefinition(
        tool_class=GenerateInsightsTool,
        workflow_id='generate-insights',
        ai_id='generate_insights',
        display_name='Generate Business Insights',
        description=(
            "Generates actionable business recommendations by translating sentiment analysis results into strategic guidance. "
            "Produces insights across four areas: (1) Competitive Positioning (differentiation strategies), "
            "(2) Customer Experience (satisfaction improvements), (3) Marketing Messages (effective messaging angles), "
            "(4) Product Improvements (feature requests and quality fixes). "
            "Each recommendation includes rationale, priority level, expected impact, and implementation considerations."
        ),
        category='analysis',
        requires_data=True,
        parameter_schema_name='GenerateInsightsParams',
        position_constraint=ToolPosition.MIDDLE,
        # LLM Guidance Fields
        prerequisites=['review_sentiment_analysis'],
        estimated_time='2-5 seconds per focus area (AI reasoning)',
        optimal_dataset_size='Inherits from sentiment analysis - works best when sentiment analysis had 100+ reviews',
        when_to_use=(
            "Use AFTER sentiment analysis when you need: "
            "(1) Strategic guidance and action items from analysis results, "
            "(2) Concrete recommendations for business decisions, "
            "(3) Prioritized list of improvements or changes to make, "
            "(4) Translation of customer feedback into actionable next steps. "
            "Best for: Executives needing strategic direction, product managers planning roadmaps, "
            "marketing teams crafting campaigns, customer success teams addressing pain points."
        ),
        when_not_to_use=(
            "Do NOT use BEFORE sentiment analysis - requires sentiment data as input (will fail without it). "
            "Do NOT use if you only need raw data or statistics without strategic interpretation. "
            "Do NOT use if you need detailed theme analysis (that's the sentiment analysis job). "
            "Do NOT use as first or second tool in workflow - needs sentiment analysis prerequisite. "
            "Do NOT expect insights to be generated from insufficient underlying data (<50 reviews in sentiment analysis)."
        )
    ),

    # ============================================================
    # OUTPUT TOOLS
    # ============================================================    
    ToolDefinition(
        tool_class=ShowResultsTool,
        workflow_id='show-results',
        ai_id='show_results',
        display_name='Show Results',
        description=(
            "Formats and displays final workflow results in a structured, readable report format. "
            "Dynamically assembles report sections based on available data from previous steps: "
            "(1) Executive Summary (requires sentiment analysis), (2) Key Themes (requires sentiment analysis), "
            "(3) Recommendations (requires insights generation), (4) Statistics & Metrics (always available), "
            "(5) Data Preview (always available). Sections without required data show 'Not Available' message. "
            "Supports optional visualizations (charts, graphs) for statistics."
        ),
        category='output',
        requires_data=True,
        parameter_schema_name='ShowResultsParams',
        position_constraint=ToolPosition.LAST,
        # LLM Guidance Fields
        prerequisites=['load_reviews'],  # Minimum requirement
        estimated_time='<1 second for formatting and display',
        optimal_dataset_size='N/A - displays whatever data is available from previous steps',
        when_to_use=(
            "Use as the FINAL/LAST tool in every workflow to present analysis results. "
            "MUST be the terminal node - no tools should come after this. "
            "Use when: (1) Ready to display final results and end workflow, "
            "(2) Need to present findings in organized, readable format, "
            "(3) Want to selectively show different report sections based on what was analyzed, "
            "(4) Need to export or view processed data and insights."
        ),
        when_not_to_use=(
            "Do NOT place in the middle of a workflow - this is a terminal operation. "
            "Do NOT use if you need to continue processing data through additional steps. "
            "Do NOT use as a checkpoint to view intermediate results (data flows automatically between steps). "
            "Do NOT use before loading any data - requires at least basic review data to display."
        )
    ),
]


# ============================================================
# TOOL REGISTRY CLASS
# ============================================================

class ToolRegistry:
    """
    Central registry for all tools
    
    Provides unified access to tools for both Workflow Builder and AI Assistant.
    Supports tiered descriptions for token optimization.
    """
    
    def __init__(self):
        # Build lookup dictionaries from definitions
        self._by_workflow_id: Dict[str, ToolDefinition] = {}
        self._by_ai_id: Dict[str, ToolDefinition] = {}
        self._all_definitions = TOOL_DEFINITIONS
        
        # Index all tools
        for tool_def in TOOL_DEFINITIONS:
            self._by_workflow_id[tool_def.workflow_id] = tool_def
            self._by_ai_id[tool_def.ai_id] = tool_def
        
        logger.info(f"✅ Tool Registry initialized with {len(TOOL_DEFINITIONS)} tools")
    
    # ==================== WORKFLOW BUILDER ACCESS ====================
    
    def get_workflow_tool(self, workflow_id: str) -> Optional[BaseTool]:
        """
        Get tool by Workflow Builder ID (e.g., 'load-reviews')
        
        Used by: WorkflowBuilderGraph
        """
        tool_def = self._by_workflow_id.get(workflow_id)
        if tool_def:
            return tool_def.instance
        return None
    
    def get_workflow_registry(self) -> Dict[str, BaseTool]:
        """
        Get complete workflow tool registry
        
        Returns: {'load-reviews': LoadReviewsTool(), ...}
        Used by: WorkflowBuilderGraph.TOOL_REGISTRY
        """
        return {
            tool_def.workflow_id: tool_def.instance
            for tool_def in self._all_definitions
        }
    
    # ==================== AI ASSISTANT ACCESS ====================
    
    def get_ai_tool(self, ai_id: str) -> Optional[BaseTool]:
        """
        Get tool by AI Assistant ID (e.g., 'load_reviews')
        
        Used by: AIAssistantGraph
        """
        tool_def = self._by_ai_id.get(ai_id)
        if tool_def:
            return tool_def.instance
        return None
    
    def get_ai_registry(self) -> Dict[str, BaseTool]:
        """
        Get complete AI tool registry
        
        Returns: {'load_reviews': LoadReviewsTool(), ...}
        Used by: AIAssistantGraph.AVAILABLE_TOOLS
        """
        return {
            tool_def.ai_id: tool_def.instance
            for tool_def in self._all_definitions
        }

    # ==================== TIERED LLM FUNCTION CALLING ====================
    
    def get_llm_tool_schemas(
        self,
        verbosity: VerbosityLevel = "standard",
        state: Optional[Dict[str, Any]] = None,
        filter_available: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get tool schemas formatted for LLM function calling with tiered descriptions
        
        Args:
            verbosity: Description detail level
                - "brief": Core description only (~20 tokens/tool, ~140 total)
                - "standard": Core + use cases (~100 tokens/tool, ~700 total) [DEFAULT]
                - "full": Everything (~250 tokens/tool, ~1750 total)
            state: Optional workflow state for contextual filtering
            filter_available: If True and state provided, only return available tools
            
        Returns:
            List of OpenAI/Anthropic compatible function schemas
            
        Token Cost Comparison:
            - brief: ~140 tokens (7 tools × ~20)
            - standard: ~700 tokens (7 tools × ~100) [RECOMMENDED DEFAULT]
            - full: ~1,750 tokens (7 tools × ~250)
        
        Usage Examples:
            # Simple workflow - use brief
            schemas = registry.get_llm_tool_schemas("brief")
            
            # Standard workflow (most common)
            schemas = registry.get_llm_tool_schemas("standard", state)
            
            # Complex decision making
            schemas = registry.get_llm_tool_schemas("full", state)
        """
        # Determine which tools to include
        if state and filter_available:
            has_data = bool(state.get('working_data', {}).get('records'))
            tool_defs = self.get_available_tools(has_data=has_data)
        else:
            tool_defs = self._all_definitions
        
        schemas = []
        for tool_def in tool_defs:
            # Get description based on verbosity level
            if verbosity == "brief":
                description = tool_def.get_brief_description()
            elif verbosity == "full":
                description = tool_def.get_full_description()
            else:  # standard
                description = tool_def.get_standard_description()
            
            schema = {
                "type": "function",
                "function": {
                    "name": tool_def.ai_id,
                    "description": description,
                    # Parameters would come from tool_schemas.py integration
                    # "parameters": get_parameter_schema(tool_def.parameter_schema_name)
                }
            }
            schemas.append(schema)
        
        logger.debug(
            f"Generated {len(schemas)} tool schemas with '{verbosity}' verbosity "
            f"(~{self._estimate_tokens(verbosity, len(schemas))} tokens)"
        )
        
        return schemas
    
    def get_contextual_tool_schemas(
        self,
        state: Dict[str, Any],
        max_tokens: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get tool schemas with context-aware descriptions
        
        Automatically optimizes descriptions based on:
        - Current workflow state
        - Available tools
        - Prerequisites met/unmet
        - Data availability
        
        Args:
            state: Current workflow state
            max_tokens: Optional token budget (will auto-select verbosity)
            
        Returns:
            List of contextually optimized tool schemas
            
        Example:
            # Let the registry decide optimal verbosity
            schemas = registry.get_contextual_tool_schemas(state)
            
            # Constrain to token budget
            schemas = registry.get_contextual_tool_schemas(state, max_tokens=500)
        """
        # Auto-select verbosity based on token budget
        if max_tokens:
            verbosity = self._select_verbosity_for_budget(max_tokens, state)
        else:
            verbosity = self._determine_optimal_verbosity(state)
        
        has_data = bool(state.get('working_data', {}).get('records'))
        tool_defs = self.get_available_tools(has_data=has_data)
        
        schemas = []
        for tool_def in tool_defs:
            description = tool_def.get_contextual_description(state)
            
            schema = {
                "type": "function",
                "function": {
                    "name": tool_def.ai_id,
                    "description": description,
                }
            }
            schemas.append(schema)
        
        return schemas
    
    def get_smart_tool_schemas(
        self,
        user_message: str,
        state: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Intelligently select verbosity based on user message complexity
        
        Analyzes user message to determine appropriate description detail:
        - Simple/clear intent → brief
        - Standard request → standard  
        - Complex/ambiguous → full
        
        Args:
            user_message: The user's query/request
            state: Current workflow state
            
        Returns:
            Tool schemas with appropriate verbosity
            
        Example:
            schemas = registry.get_smart_tool_schemas(
                "Load and filter reviews",  # Simple → brief
                state
            )
            
            schemas = registry.get_smart_tool_schemas(
                "Help me understand customer sentiment",  # Complex → full
                state
            )
        """
        verbosity = self._analyze_message_complexity(user_message, state)
        return self.get_llm_tool_schemas(verbosity, state)
    
    # ==================== HELPER METHODS FOR TIERED LOGIC ====================
    
    def _estimate_tokens(self, verbosity: VerbosityLevel, num_tools: int) -> int:
        """Estimate token count for given verbosity and tool count"""
        tokens_per_tool = {
            "brief": 20,
            "standard": 100,
            "full": 250
        }
        return tokens_per_tool.get(verbosity, 100) * num_tools
    
    def _determine_optimal_verbosity(self, state: Dict[str, Any]) -> VerbosityLevel:
        """
        Determine optimal verbosity based on workflow state
        
        Logic:
        - Workflow just started → standard (need good guidance)
        - Mid-workflow with clear path → brief (just show next steps)
        - Many tools executed → standard (maintain context)
        - Error occurred → full (need comprehensive info for recovery)
        """
        executed_tools = state.get('executed_tools', [])
        has_error = state.get('error') is not None
        
        # Error recovery needs full context
        if has_error:
            return "full"
        
        # Fresh start - use standard for good guidance
        if len(executed_tools) == 0:
            return "standard"
        
        # Mid-workflow with 1-2 tools - brief is sufficient
        if len(executed_tools) <= 2:
            return "brief"
        
        # Complex workflow (3+ tools) - use standard
        return "standard"
    
    def _select_verbosity_for_budget(
        self,
        max_tokens: int,
        state: Dict[str, Any]
    ) -> VerbosityLevel:
        """Select highest verbosity that fits token budget"""
        has_data = bool(state.get('working_data', {}).get('records'))
        num_tools = len(self.get_available_tools(has_data=has_data))
        
        # Try full first, fall back as needed
        if self._estimate_tokens("full", num_tools) <= max_tokens:
            return "full"
        elif self._estimate_tokens("standard", num_tools) <= max_tokens:
            return "standard"
        else:
            return "brief"
    
    def _analyze_message_complexity(
        self,
        message: str,
        state: Dict[str, Any]
    ) -> VerbosityLevel:
        """
        Analyze user message to determine appropriate verbosity
        
        Heuristics:
        - Explicit tool names → brief (user knows what they want)
        - Ambiguous terms (help, understand, analyze) → full
        - Standard analysis request → standard
        - Already in workflow → brief/standard
        """
        message_lower = message.lower()
        executed_tools = state.get('executed_tools', [])
        
        # If workflow already in progress, use brief/standard
        if len(executed_tools) > 0:
            return "standard"
        
        # Check for ambiguous/complex terms
        complex_terms = [
            'help', 'understand', 'analyze', 'explain', 'recommend',
            'what should', 'how can', 'best way', 'suggest'
        ]
        if any(term in message_lower for term in complex_terms):
            return "full"
        
        # Check for explicit tool mentions (user knows what they want)
        tool_names = ['load', 'filter', 'sort', 'clean', 'sentiment', 'insight']
        if any(tool in message_lower for tool in tool_names):
            return "brief"
        
        # Default to standard for moderate complexity
        return "standard"
    
    # ==================== METADATA & VALIDATION ====================
    
    def get_tool_definition(
        self,
        workflow_id: Optional[str] = None,
        ai_id: Optional[str] = None
    ) -> Optional[ToolDefinition]:
        """Get complete tool definition by either ID"""
        if workflow_id:
            return self._by_workflow_id.get(workflow_id)
        if ai_id:
            return self._by_ai_id.get(ai_id)
        return None
    
    def get_all_definitions(self) -> List[ToolDefinition]:
        """Get all tool definitions"""
        return self._all_definitions.copy()
    
    def get_available_tools(self, has_data: bool = False) -> List[ToolDefinition]:
        """
        Get tools available based on current state
        
        Args:
            has_data: Whether data exists in working_data
            
        Returns:
            List of available tool definitions
        """
        if has_data:
            # All tools available
            return self._all_definitions.copy()
        else:
            # Only tools that don't require data
            return [
                tool_def for tool_def in self._all_definitions
                if not tool_def.requires_data
            ]
    
    def get_tools_by_category(self, category: str) -> List[ToolDefinition]:
        """Get all tools in a category ('input', 'data', 'analysis', 'output')"""
        return [
            tool_def for tool_def in self._all_definitions
            if tool_def.category == category
        ]
    
    def check_prerequisites(
        self,
        tool_id: str,
        executed_tools: List[str],
        id_type: str = 'ai'
    ) -> tuple[bool, List[str]]:
        """
        Check if all prerequisites for a tool have been executed
        
        Args:
            tool_id: Tool identifier
            executed_tools: List of already executed tool IDs (in ai_id format)
            id_type: 'ai' or 'workflow'
            
        Returns:
            (all_met, list_of_missing_prerequisites)
        """
        # Get tool definition
        if id_type == 'ai':
            tool_def = self._by_ai_id.get(tool_id)
        else:
            tool_def = self._by_workflow_id.get(tool_id)
        
        if not tool_def:
            return False, [f"Unknown tool: {tool_id}"]
        
        # Check prerequisites
        missing = []
        for prereq_id in tool_def.prerequisites:
            if prereq_id not in executed_tools:
                # Get friendly name for error message
                prereq_def = self._by_ai_id.get(prereq_id)
                prereq_name = prereq_def.display_name if prereq_def else prereq_id
                missing.append(prereq_name)
        
        return len(missing) == 0, missing
    
    def can_execute_tool(
        self,
        tool_id: str,
        state: Dict[str, Any],
        id_type: str = 'ai'
    ) -> tuple[bool, Optional[str]]:
        """
        Check if tool can be executed in current state
        
        Args:
            tool_id: Tool identifier
            state: Current workflow state
            id_type: 'ai' or 'workflow'
            
        Returns:
            (can_execute, reason_if_not)
        """
        # Get tool definition
        if id_type == 'ai':
            tool_def = self._by_ai_id.get(tool_id)
        else:
            tool_def = self._by_workflow_id.get(tool_id)
        
        if not tool_def:
            return False, f"Unknown tool: {tool_id}"
        
        # Check if tool requires data
        if tool_def.requires_data:
            working_data = state.get('working_data', {})
            records = working_data.get('records', [])
            
            if not records:
                return False, f"{tool_def.display_name} requires existing data"
        
        # Check prerequisites
        executed_tools = state.get('executed_tools', [])
        prereqs_met, missing = self.check_prerequisites(tool_id, executed_tools, id_type)
        
        if not prereqs_met:
            missing_str = ', '.join(missing)
            return False, f"{tool_def.display_name} requires these tools to run first: {missing_str}"
        
        return True, None
    
    # ==================== UTILITY ====================
    
    def list_all_tools(self) -> Dict[str, Dict[str, Any]]:
        """Export all tools as dict for API/frontend"""
        return {
            tool_def.workflow_id: tool_def.to_dict()
            for tool_def in self._all_definitions
        }
    
    def get_tool_count(self) -> int:
        """Get total number of registered tools"""
        return len(self._all_definitions)
    
    def validate_workflow_definition(self, workflow: Dict[str, Any]) -> tuple[bool, List[str]]:
        """
        Validate that all tools in workflow exist and prerequisites are met
        
        Args:
            workflow: Workflow definition with nodes
            
        Returns:
            (is_valid, list_of_errors)
        """
        errors = []
        nodes = workflow.get('nodes', [])
        executed = []
        
        for node in nodes:
            template_id = node.get('data', {}).get('template_id')
            
            # Check tool exists
            if template_id and template_id not in self._by_workflow_id:
                errors.append(f"Unknown tool in node {node.get('id')}: {template_id}")
                continue
            
            # Check prerequisites
            tool_def = self._by_workflow_id.get(template_id)
            if tool_def and tool_def.prerequisites:
                prereqs_met, missing = self.check_prerequisites(
                    tool_def.ai_id,
                    executed,
                    id_type='ai'
                )
                if not prereqs_met:
                    errors.append(
                        f"Tool '{tool_def.display_name}' requires {', '.join(missing)} "
                        f"to be executed first"
                    )
            
            # Track as executed for next iteration
            if tool_def:
                executed.append(tool_def.ai_id)
        
        return len(errors) == 0, errors


# ============================================================
# GLOBAL REGISTRY INSTANCE
# ============================================================

# Single global instance - import this everywhere
tool_registry = ToolRegistry()


# ============================================================
# BACKWARDS COMPATIBILITY (Optional)
# ============================================================
# These can be removed once all code uses tool_registry directly

def get_workflow_tools() -> Dict[str, BaseTool]:
    """Get workflow tool registry (backwards compatible)"""
    return tool_registry.get_workflow_registry()


def get_ai_tools() -> Dict[str, BaseTool]:
    """Get AI tool registry (backwards compatible)"""
    return tool_registry.get_ai_registry()


def get_tools_for_llm(
    verbosity: VerbosityLevel = "standard",
    state: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Convenience function for getting LLM tool schemas
    
    Args:
        verbosity: "brief", "standard", or "full"
        state: Optional workflow state for filtering
        
    Returns:
        Tool schemas ready for LLM function calling
    """
    return tool_registry.get_llm_tool_schemas(verbosity, state)