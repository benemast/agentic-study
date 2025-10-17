# backend/tests/test_tool_schemas.py
"""
Tests for tool schemas integrated with centralized tool registry
"""
import pytest
from app.orchestrator.llm.tool_schemas import (
    ToolValidator,
    tool_validator,
    AgentDecision,
    ActionType,
    GatherDataParams,
    FilterDataParams,
    PARAMETER_SCHEMAS
)
from app.orchestrator.tools.registry import tool_registry


class TestToolValidator:
    """Test ToolValidator integration with registry"""
    
    def test_validator_uses_registry(self):
        """Verify validator uses tool registry"""
        assert tool_validator.registry is tool_registry
    
    def test_tool_parameter_validation_valid(self):
        """Test valid tool parameter validation"""
        # Valid parameters for gather_data
        params = {"source": "api", "query": "test"}
        validated = tool_validator.validate_tool_params(
            'gather_data',  # Use AI ID, not enum
            params
        )
        assert validated['source'] == "api"
        assert validated['query'] == "test"
    
    def test_tool_parameter_validation_invalid(self):
        """Test invalid parameters raise ValueError"""
        # Invalid parameters should raise
        with pytest.raises(ValueError):
            tool_validator.validate_tool_params(
                'gather_data',
                {"invalid_field": "value"}
            )
    
    def test_tool_parameter_validation_no_params(self):
        """Test tools without parameters return empty dict"""
        # clean_data has no parameters
        validated = tool_validator.validate_tool_params(
            'clean_data',
            {}
        )
        assert validated == {}
    
    def test_tool_parameter_validation_unknown_tool(self):
        """Test validation fails for unknown tool"""
        with pytest.raises(ValueError, match="Unknown tool"):
            tool_validator.validate_tool_params(
                'nonexistent_tool',
                {}
            )
    
    def test_tool_availability_no_data(self):
        """Test tool availability when no data exists"""
        state_no_data = {'working_data': {'records': []}}
        
        # gather_data should be available (doesn't require data)
        can_execute, _ = tool_validator.can_execute_tool(
            'gather_data', 
            state_no_data
        )
        assert can_execute == True
        
        # sentiment_analysis should NOT be available (requires data)
        can_execute, reason = tool_validator.can_execute_tool(
            'sentiment_analysis',
            state_no_data
        )
        assert can_execute == False
        assert "requires existing data" in reason.lower()
    
    def test_tool_availability_with_data(self):
        """Test tool availability when data exists"""
        state_with_data = {
            'working_data': {
                'records': [
                    {'id': 1, 'text': 'test', 'value': 50}
                ]
            }
        }
        
        # Both tools should be available now
        can_execute, _ = tool_validator.can_execute_tool(
            'gather_data',
            state_with_data
        )
        assert can_execute == True
        
        can_execute, _ = tool_validator.can_execute_tool(
            'sentiment_analysis',
            state_with_data
        )
        assert can_execute == True
    
    def test_get_tool_description(self):
        """Test getting tool description from registry"""
        description = tool_validator.get_tool_description('gather_data')
        assert isinstance(description, str)
        assert len(description) > 0
        assert 'data' in description.lower()
    
    def test_get_available_tools_no_data(self):
        """Test getting available tools when no data exists"""
        state = {'working_data': {'records': []}}
        
        available = tool_validator.get_available_tools(state)
        
        # Should include gather_data (doesn't require data)
        assert 'gather_data' in available
        
        # Should NOT include sentiment_analysis (requires data)
        assert 'sentiment_analysis' not in available
    
    def test_get_available_tools_with_data(self):
        """Test getting available tools when data exists"""
        state = {
            'working_data': {
                'records': [{'id': 1, 'text': 'test'}]
            }
        }
        
        available = tool_validator.get_available_tools(state)
        
        # Should include both types of tools
        assert 'gather_data' in available
        assert 'sentiment_analysis' in available
        assert len(available) > 5  # Should have multiple tools
    
    def test_format_tools_for_prompt(self):
        """Test formatting tools for LLM prompt"""
        prompt_text = tool_validator.format_tools_for_prompt()
        
        # Should contain tool names and descriptions
        assert 'gather_data' in prompt_text
        assert 'sentiment_analysis' in prompt_text
        assert 'Collect' in prompt_text or 'gather' in prompt_text.lower()
    
    def test_format_tools_for_prompt_with_state(self):
        """Test formatting tools based on state"""
        state_no_data = {'working_data': {'records': []}}
        
        prompt_text = tool_validator.format_tools_for_prompt(state_no_data)
        
        # Should only show available tools
        assert 'gather_data' in prompt_text
        # sentiment_analysis might not be shown if filtered by availability
    
    def test_get_tool_metadata(self):
        """Test getting complete tool metadata"""
        metadata = tool_validator.get_tool_metadata('gather_data')
        
        assert metadata is not None
        assert metadata['ai_id'] == 'gather_data'
        assert metadata['workflow_id'] == 'gather-data'
        assert metadata['display_name'] == 'Gather Data'
        assert 'description' in metadata
        assert metadata['category'] in ['data', 'analysis']
        assert isinstance(metadata['requires_data'], bool)
        assert isinstance(metadata['has_parameters'], bool)
    
    def test_get_tool_metadata_unknown(self):
        """Test getting metadata for unknown tool"""
        metadata = tool_validator.get_tool_metadata('nonexistent_tool')
        assert metadata is None
    
    def test_validate_decision_valid(self):
        """Test validating a valid agent decision"""
        decision_dict = {
            'action': 'gather',
            'tool_name': 'gather_data',
            'reasoning': 'Need to collect data first',
            'tool_params': {'source': 'default'},
            'confidence': 0.9,
            'alternatives_considered': ['use sample data']
        }
        
        state = {'working_data': {'records': []}}
        
        is_valid, error = tool_validator.validate_decision(decision_dict, state)
        assert is_valid == True
        assert error is None
    
    def test_validate_decision_invalid_tool(self):
        """Test validation fails for invalid tool"""
        decision_dict = {
            'action': 'gather',
            'tool_name': 'nonexistent_tool',
            'reasoning': 'Test',
            'confidence': 0.9
        }
        
        state = {'working_data': {'records': []}}
        
        is_valid, error = tool_validator.validate_decision(decision_dict, state)
        assert is_valid == False
        assert error is not None
    
    def test_validate_decision_tool_cannot_execute(self):
        """Test validation fails when tool cannot execute"""
        decision_dict = {
            'action': 'analyze',
            'tool_name': 'sentiment_analysis',  # Requires data
            'reasoning': 'Analyze sentiment',
            'confidence': 0.8
        }
        
        state = {'working_data': {'records': []}}  # No data!
        
        is_valid, error = tool_validator.validate_decision(decision_dict, state)
        assert is_valid == False
        assert 'cannot execute' in error.lower()
    
    def test_get_tools_by_category(self):
        """Test getting tools filtered by category"""
        data_tools = tool_validator.get_tools_by_category('data')
        analysis_tools = tool_validator.get_tools_by_category('analysis')
        
        assert 'gather_data' in data_tools
        assert 'sentiment_analysis' in analysis_tools
        assert 'sentiment_analysis' not in data_tools
    
    def test_get_all_tool_ids(self):
        """Test getting all tool AI IDs"""
        all_tools = tool_validator.get_all_tool_ids()
        
        assert isinstance(all_tools, list)
        assert 'gather_data' in all_tools
        assert 'sentiment_analysis' in all_tools
        assert len(all_tools) == tool_registry.get_tool_count()


class TestAgentDecision:
    """Test AgentDecision Pydantic model"""
    
    def test_agent_decision_valid(self):
        """Test creating valid agent decision"""
        decision = AgentDecision(
            action=ActionType.GATHER,
            tool_name='gather_data',
            reasoning='Need to collect data',
            tool_params={'source': 'api'},
            confidence=0.9,
            alternatives_considered=['use sample data']
        )
        
        assert decision.action == ActionType.GATHER
        assert decision.tool_name == 'gather_data'
        assert decision.confidence == 0.9
    
    def test_agent_decision_finish_no_tool(self):
        """Test finish action should have no tool"""
        decision = AgentDecision(
            action=ActionType.FINISH,
            tool_name=None,
            reasoning='Task complete',
            confidence=0.95
        )
        
        assert decision.action == ActionType.FINISH
        assert decision.tool_name is None
    
    def test_agent_decision_invalid_tool(self):
        """Test decision with invalid tool raises error"""
        with pytest.raises(ValueError, match="Unknown tool"):
            AgentDecision(
                action=ActionType.GATHER,
                tool_name='nonexistent_tool',
                reasoning='Test',
                confidence=0.9
            )
    
    def test_agent_decision_confidence_clamping(self):
        """Test confidence gets clamped to [0, 1]"""
        # Test max clamping
        decision = AgentDecision(
            action=ActionType.FINISH,
            tool_name=None,
            reasoning='Test',
            confidence=1.5  # Over 1.0
        )
        assert decision.confidence == 1.0
        
        # Test min clamping
        decision = AgentDecision(
            action=ActionType.FINISH,
            tool_name=None,
            reasoning='Test',
            confidence=-0.5  # Under 0.0
        )
        assert decision.confidence == 0.0
    
    def test_agent_decision_defaults(self):
        """Test default values"""
        decision = AgentDecision(
            action=ActionType.FINISH,
            reasoning='Done'
        )
        
        assert decision.tool_name is None
        assert decision.tool_params == {}
        assert decision.confidence == 0.5  # Default
        assert decision.alternatives_considered == []


class TestParameterSchemas:
    """Test parameter schema definitions"""
    
    def test_gather_data_params(self):
        """Test GatherDataParams schema"""
        params = GatherDataParams(source='api', query='test')
        
        assert params.source == 'api'
        assert params.query == 'test'
    
    def test_gather_data_params_defaults(self):
        """Test GatherDataParams default values"""
        params = GatherDataParams()
        
        assert params.source == 'default'
        assert params.query == ''
    
    def test_filter_data_params(self):
        """Test FilterDataParams schema"""
        params = FilterDataParams(min_value=10, max_value=100)
        
        assert params.min_value == 10
        assert params.max_value == 100
    
    def test_filter_data_params_optional(self):
        """Test FilterDataParams optional fields"""
        params = FilterDataParams(min_value=10)
        
        assert params.min_value == 10
        assert params.max_value is None
    
    def test_parameter_schemas_mapping(self):
        """Test PARAMETER_SCHEMAS mapping is complete"""
        # Should have entries for all tools
        assert 'gather_data' in PARAMETER_SCHEMAS
        assert 'filter_data' in PARAMETER_SCHEMAS
        assert 'sentiment_analysis' in PARAMETER_SCHEMAS
        
        # Some should be None (no parameters)
        assert PARAMETER_SCHEMAS['clean_data'] is None
        assert PARAMETER_SCHEMAS['sentiment_analysis'] is None


class TestHelperFunctions:
    """Test helper functions"""
    
    def test_map_action_to_tool(self):
        """Test action to tool mapping"""
        from app.orchestrator.llm.tool_schemas import map_action_to_tool
        
        state = {'working_data': {'records': []}}
        
        # GATHER should map to gather_data
        tool = map_action_to_tool(ActionType.GATHER, state)
        assert tool == 'gather_data'
        
        # FILTER should map to filter_data (if data available)
        state_with_data = {'working_data': {'records': [{'id': 1}]}}
        tool = map_action_to_tool(ActionType.FILTER, state_with_data)
        assert tool == 'filter_data'
    
    def test_get_tool_count(self):
        """Test getting total tool count"""
        from app.orchestrator.llm.tool_schemas import get_tool_count
        
        count = get_tool_count()
        assert count == 8  # Should have 8 tools
    
    def test_list_all_tools(self):
        """Test listing all tools with metadata"""
        from app.orchestrator.llm.tool_schemas import list_all_tools
        
        all_tools = list_all_tools()
        
        assert isinstance(all_tools, dict)
        assert 'gather_data' in all_tools
        assert 'sentiment_analysis' in all_tools
        
        # Check metadata structure
        gather_data = all_tools['gather_data']
        assert 'ai_id' in gather_data
        assert 'workflow_id' in gather_data
        assert 'display_name' in gather_data
        assert 'description' in gather_data
        assert 'category' in gather_data
        assert 'requires_data' in gather_data


# Integration test
def test_schemas_registry_integration():
    """Test that schemas integrate correctly with registry"""
    from app.orchestrator.tools.registry import tool_registry
    
    # Validator should use registry
    assert tool_validator.registry is tool_registry
    
    # All tools in registry should be accessible via validator
    for tool_def in tool_registry.get_all_definitions():
        # Should be able to get metadata
        metadata = tool_validator.get_tool_metadata(tool_def.ai_id)
        assert metadata is not None
        assert metadata['ai_id'] == tool_def.ai_id