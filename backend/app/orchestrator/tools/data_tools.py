# backend/app/orchestrator/tools/data_tools.py
from typing import Dict, Any, List
import logging
from datetime import datetime
import time

logger = logging.getLogger(__name__)


class BaseTool:
    """Base class for all tools with common functionality"""
    
    def __init__(self, name: str):
        self.name = name
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the tool - to be implemented by subclasses"""
        raise NotImplementedError
    
    def _measure_execution(self, func, *args, **kwargs):
        """Measure execution time of a function"""
        start_time = time.time()
        result = func(*args, **kwargs)
        execution_time = int((time.time() - start_time) * 1000)  # ms
        return result, execution_time


class GatherDataTool(BaseTool):
    """
    Simulates data gathering operation
    In real implementation: API calls, database queries, file reading, etc.
    """
    
    def __init__(self):
        super().__init__("Gather Data")
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Gather data based on input parameters
        
        Args:
            input_data: Contains 'source' and optional 'query' parameters
            
        Returns:
            Dictionary with gathered data
        """
        start_time = time.time()
        
        try:
            source = input_data.get('source', 'default')
            query = input_data.get('query', '')
            
            logger.info(f"Gathering data from source: {source}")
            
            # Simulate data gathering
            # In real implementation: connect to APIs, databases, etc.
            gathered_data = {
                'source': source,
                'query': query,
                'records': [
                    {'id': 1, 'text': 'Sample data point 1', 'value': 42},
                    {'id': 2, 'text': 'Sample data point 2', 'value': 87},
                    {'id': 3, 'text': 'Sample data point 3', 'value': 23},
                ],
                'timestamp': datetime.utcnow().isoformat(),
                'count': 3
            }
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'data': gathered_data,
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'records_gathered': len(gathered_data['records'])
                }
            }
            
        except Exception as e:
            logger.error(f"Error in GatherDataTool: {e}")
            return {
                'success': False,
                'error': str(e),
                'data': None
            }


class FilterDataTool(BaseTool):
    """Filter data based on criteria"""
    
    def __init__(self):
        super().__init__("Filter Data")
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Filter data based on criteria
        
        Args:
            input_data: Contains 'data' and 'filter_criteria'
            
        Returns:
            Filtered data
        """
        start_time = time.time()
        
        try:
            data = input_data.get('data', {})
            records = data.get('records', [])
            filter_criteria = input_data.get('filter_criteria', {})
            
            logger.info(f"Filtering {len(records)} records with criteria: {filter_criteria}")
            
            # Apply filters
            filtered_records = records
            
            # Example filter: value threshold
            if 'min_value' in filter_criteria:
                min_value = filter_criteria['min_value']
                filtered_records = [r for r in filtered_records if r.get('value', 0) >= min_value]
            
            if 'max_value' in filter_criteria:
                max_value = filter_criteria['max_value']
                filtered_records = [r for r in filtered_records if r.get('value', 0) <= max_value]
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'data': {
                    **data,
                    'records': filtered_records,
                    'original_count': len(records),
                    'filtered_count': len(filtered_records)
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'records_filtered': len(records) - len(filtered_records)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in FilterDataTool: {e}")
            return {
                'success': False,
                'error': str(e),
                'data': None
            }


class CleanDataTool(BaseTool):
    """Clean and normalize data"""
    
    def __init__(self):
        super().__init__("Clean Data")
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Clean data: remove nulls, normalize formats, etc.
        
        Args:
            input_data: Contains 'data'
            
        Returns:
            Cleaned data
        """
        start_time = time.time()
        
        try:
            data = input_data.get('data', {})
            records = data.get('records', [])
            
            logger.info(f"Cleaning {len(records)} records")
            
            # Clean records
            cleaned_records = []
            issues_found = 0
            
            for record in records:
                cleaned_record = {}
                for key, value in record.items():
                    # Remove None values
                    if value is None:
                        issues_found += 1
                        continue
                    
                    # Normalize strings
                    if isinstance(value, str):
                        cleaned_record[key] = value.strip()
                    else:
                        cleaned_record[key] = value
                
                if cleaned_record:  # Only add non-empty records
                    cleaned_records.append(cleaned_record)
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'data': {
                    **data,
                    'records': cleaned_records,
                    'cleaned': True
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'issues_fixed': issues_found,
                    'records_cleaned': len(cleaned_records)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in CleanDataTool: {e}")
            return {
                'success': False,
                'error': str(e),
                'data': None
            }


class SortDataTool(BaseTool):
    """Sort data based on field"""
    
    def __init__(self):
        super().__init__("Sort Data")
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sort data by specified field
        
        Args:
            input_data: Contains 'data', 'sort_by', and 'order' (asc/desc)
            
        Returns:
            Sorted data
        """
        start_time = time.time()
        
        try:
            data = input_data.get('data', {})
            records = data.get('records', [])
            sort_by = input_data.get('sort_by', 'id')
            order = input_data.get('order', 'asc')
            
            logger.info(f"Sorting {len(records)} records by {sort_by} ({order})")
            
            # Sort records
            sorted_records = sorted(
                records,
                key=lambda x: x.get(sort_by, 0),
                reverse=(order == 'desc')
            )
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'data': {
                    **data,
                    'records': sorted_records,
                    'sorted_by': sort_by
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'sort_field': sort_by,
                    'sort_order': order
                }
            }
            
        except Exception as e:
            logger.error(f"Error in SortDataTool: {e}")
            return {
                'success': False,
                'error': str(e),
                'data': None
            }


class CombineDataTool(BaseTool):
    """Combine multiple data sources"""
    
    def __init__(self):
        super().__init__("Combine Data")
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Combine data from multiple sources
        
        Args:
            input_data: Contains 'sources' list with data objects
            
        Returns:
            Combined data
        """
        start_time = time.time()
        
        try:
            sources = input_data.get('sources', [])
            
            logger.info(f"Combining {len(sources)} data sources")
            
            # Combine all records
            all_records = []
            for source in sources:
                if isinstance(source, dict) and 'records' in source:
                    all_records.extend(source['records'])
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'data': {
                    'records': all_records,
                    'combined_from': len(sources),
                    'total_records': len(all_records)
                },
                'execution_time_ms': execution_time,
                'metadata': {
                    'tool': self.name,
                    'sources_combined': len(sources)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in CombineDataTool: {e}")
            return {
                'success': False,
                'error': str(e),
                'data': None
            }