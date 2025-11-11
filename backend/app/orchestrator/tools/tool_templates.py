from typing import List, Dict, Any, TypedDict
import copy


class WorkflowNode(TypedDict):
    id: str
    data: Dict[str, Any]


class WorkflowEdge(TypedDict):
    source: str
    target: str
    sourceHandle: str
    targetHandle: str


class Workflow(TypedDict):
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]


class WorkflowTemplate(TypedDict):
    id: str
    name: str
    description: str
    workflow: Workflow


WORKFLOW_TEMPLATES: List[WorkflowTemplate] = [
    {
        "id": "get_data",
        "name": "Get Review Data",
        "description": "Load review data from the database, sort by star rating (highest first), remove duplicates and missing values, then display a preview of up to 200 cleaned records. Perfect for getting an initial overview of your dataset.",
        "workflow": {
            "nodes": [
                {
                    "id": "load-reviews-12",
                    "data": {
                        "template_id": "load-reviews",
                        "config": {
                            "category": "{category}",
                            "limit": None
                        },
                        "label": "Load {category_label} Reviews"
                    }
                },
                {
                    "id": "sort-reviews-15",
                    "data": {
                        "template_id": "sort-reviews",
                        "config": {
                            "sort_by": "{sort_field}",
                            "descending": "{descending}"
                        },
                        "label": "Sort Reviews"
                    }
                },
                {
                    "id": "clean-data-16",
                    "data": {
                        "template_id": "clean-data",
                        "config": {
                            "remove_nulls": True,
                            "normalize_text": True,
                            "remove_duplicates": True
                        },
                        "label": "Clean Reviews"
                    }
                },
                {
                    "id": "show-results-14",
                    "data": {
                        "template_id": "show-results",
                        "config": {
                            "include_sections": [
                                "data_preview"
                            ],
                            "max_data_items": "{limit}"
                        },
                        "label": "Show Results"
                    }
                }
            ],
            "edges": [
                {
                    "source": "load-reviews-12",
                    "target": "sort-reviews-15",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "sort-reviews-15",
                    "target": "clean-data-16",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "clean-data-16",
                    "target": "show-results-14",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                }
            ]
        }
    },
    {
        "id": "filtered_data",
        "name": "Get Filtered Review Data",
        "description": "Load reviews, filter to keep only those with ratings above 1 star, normalize text and remove null values, then display up to 50 filtered results. Use this workflow to focus on meaningful reviews and exclude extremely negative or incomplete data.",
        "workflow": {
            "nodes": [
                {
                    "id": "load-reviews-17",
                    "data": {
                        "template_id": "load-reviews",
                        "config": {
                            "category": "{category}",
                            "limit": None
                        },
                        "label": "Load {category_label} Reviews"
                    }
                },
                {
                    "id": "filter-reviews-18",
                    "data": {
                        "template_id": "filter-reviews",
                        "config": {
                            "field": "{filter_field}",
                            "operator": "{filter_operator}",
                            "value": "{filter_value}"
                        },
                        "label": "Filter Reviews"
                    }
                },
                {
                    "id": "clean-data-19",
                    "data": {
                        "template_id": "clean-data",
                        "config": {
                            "remove_nulls": True,
                            "normalize_text": True,
                            "remove_duplicates": True
                        },
                        "label": "Clean Reviews"
                    }
                },
                {
                    "id": "show-results-22",
                    "data": {
                        "template_id": "show-results",
                        "config": {
                            "include_sections": [
                                "data_preview"
                            ],
                            "max_data_items": "{limit}"
                        },
                        "label": "Show Results"
                    }
                }
            ],
            "edges": [
                {
                    "source": "load-reviews-17",
                    "target": "filter-reviews-18",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "filter-reviews-18",
                    "target": "clean-data-19",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "clean-data-19",
                    "target": "show-results-22",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                }
            ]
        }
    },
    {
        "id": "theme_extraction",
        "name": "Theme Extraction",
        "description": "Load and filter reviews (ratings above 1 star), clean the data, then perform sentiment analysis to automatically extract up to 5 key themes per sentiment category (positive, neutral, negative). Ideal for understanding what customers are talking about and how they feel about different aspects of the product.",
        "workflow": {
            "nodes": [
                {
                    "id": "load-reviews-33",
                    "data": {
                        "template_id": "load-reviews",
                        "config": {
                            "category": "{category}",
                            "limit": None
                        },
                        "label": "Load {category_label} Reviews"
                    }
                },
                {
                    "id": "filter-reviews-34",
                    "data": {
                        "template_id": "filter-reviews",
                        "config": {
                            "field": "{filter_field}",
                            "operator": "{filter_operator}",
                            "value": "{filter_value}"
                        },
                        "label": "Filter Reviews"
                    }
                },
                {
                    "id": "clean-data-35",
                    "data": {
                        "template_id": "clean-data",
                        "config": {
                            "remove_nulls": True,
                            "normalize_text": True,
                            "remove_duplicates": True
                        },
                        "label": "Clean Reviews"
                    }
                },
                {
                    "id": "sort-reviews-38",
                    "data": {
                        "template_id": "sort-reviews",
                        "config": {
                            "sort_by": "{sort_field}",
                            "descending": "{descending}"
                        },
                        "label": "Sort Reviews"
                    }
                },
                {
                    "id": "review-sentiment-analysis-36",
                    "data": {
                        "template_id": "review-sentiment-analysis",
                        "config": {
                            "extract_themes": True,
                            "theme_separation": "by_sentiment",
                            "max_themes_per_category": "{number_of_themes}",
                            "include_percentages": True
                        },
                        "label": "Sentiment Analysis"
                    }
                },
                {
                    "id": "show-results-37",
                    "data": {
                        "template_id": "show-results",
                        "config": {
                            "include_sections": [
                                "data_preview",
                                "themes",
                                "statistics"
                            ],
                            "max_data_items": "{limit}",
                            "statistics_metrics": [
                                "sentiment_distribution",
                                "review_summary",
                                "rating_distribution",
                                "verified_rate",
                                "theme_coverage",
                                "sentiment_consistency"
                            ]
                        },
                        "label": "Show Results"
                    }
                }
            ],
            "edges": [
                {
                    "source": "load-reviews-33",
                    "target": "filter-reviews-34",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "filter-reviews-34",
                    "target": "clean-data-35",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "review-sentiment-analysis-36",
                    "target": "show-results-37",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "clean-data-35",
                    "target": "sort-reviews-38",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "sort-reviews-38",
                    "target": "review-sentiment-analysis-36",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                }
            ]
        }
    },
    {
        "id": "analyze_data",
        "name": "Analyze Data",
        "description": "Complete end-to-end analysis pipeline: Load reviews for a specific product, clean the data, perform comprehensive sentiment analysis with theme extraction, generate strategic insights across competitive positioning, customer experience, marketing, and product improvements, then display a detailed report including executive summary, themes, recommendations, and statistical metrics (sentiment distribution, rating patterns, verified purchase rates, theme coverage, and sentiment consistency).",
        "workflow": {
            "nodes": [
                {
                    "id": "load-reviews-33",
                    "data": {
                        "template_id": "load-reviews",
                        "config": {
                            "category": "{category}",
                            "limit": None
                        },
                        "label": "Load {category_label} Reviews"
                    }
                },
                {
                    "id": "filter-reviews-34",
                    "data": {
                        "template_id": "filter-reviews",
                        "config": {
                            "field": "{filter_field}",
                            "operator": "{filter_operator}",
                            "value": "{filter_value}"
                        },
                        "label": "Filter Reviews"
                    }
                },
                {
                    "id": "clean-data-35",
                    "data": {
                        "template_id": "clean-data",
                        "config": {
                            "remove_nulls": True,
                            "normalize_text": True,
                            "remove_duplicates": True
                        },
                        "label": "Clean Reviews"
                    }
                },
                {
                    "id": "sort-reviews-38",
                    "data": {
                        "template_id": "sort-reviews",
                        "config": {
                            "sort_by": "{sort_field}",
                            "descending": "{descending}"
                        },
                        "label": "Sort Reviews"
                    }
                },
                {
                    "id": "review-sentiment-analysis-36",
                    "data": {
                        "template_id": "review-sentiment-analysis",
                        "config": {
                            "extract_themes": True,
                            "theme_separation": "by_sentiment",
                            "max_themes_per_category": "{number_of_themes}",
                            "include_percentages": True
                        },
                        "label": "Sentiment Analysis"
                    }
                },
                {
                    "id": "generate-insights-39",
                    "data": {
                        "template_id": "generate-insights",
                        "config": {
                            "focus_area": [
                                "competitive_positioning",
                                "customer_experience",
                                "marketing_messages",
                                "product_improvements"
                            ],
                            "max_recommendations": "{number_of_themes}"
                        },
                        "label": "Generate Insights"
                    }
                },
                {
                    "id": "show-results-40",
                    "data": {
                        "template_id": "show-results",
                        "config": {
                            "include_sections": [
                                "data_preview",
                                "executive_summary",
                                "themes",
                                "recommendations",
                                "statistics"
                            ],
                            "max_data_items": "{limit}",
                            "statistics_metrics": [
                                "sentiment_distribution",
                                "review_summary",
                                "rating_distribution",
                                "verified_rate",
                                "theme_coverage",
                                "sentiment_consistency"
                            ]
                        },
                        "label": "Show Results"
                    }
                }
            ],
            "edges": [
                {
                    "source": "load-reviews-33",
                    "target": "filter-reviews-34",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "filter-reviews-34",
                    "target": "clean-data-35",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "clean-data-35",
                    "target": "sort-reviews-38",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "sort-reviews-38",
                    "target": "review-sentiment-analysis-36",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "review-sentiment-analysis-36",
                    "target": "generate-insights-39",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                },
                {
                    "source": "generate-insights-39",
                    "target": "show-results-40",
                    "sourceHandle": "output-0",
                    "targetHandle": "input-0"
                }
            ]
        }
    }
]


def _convert_value_type(value: Any) -> Any:
    """Convert string values to their proper types (bool, int, float, etc)."""
    if not isinstance(value, str):
        return value
    
    # Handle boolean values
    if value.lower() in ("true", "false"):
        return value.lower() == "true"
    
    # Handle None/null
    if value.lower() in ("none", "null"):
        return None
    
    # Try to convert to int
    try:
        return int(value)
    except ValueError:
        pass
    
    # Try to convert to float
    try:
        return float(value)
    except ValueError:
        pass
    
    # Return as string
    return value


def _replace_placeholders_recursive(obj: Any, replacements: Dict[str, Any]) -> Any:
    """Recursively replace {placeholder} tokens in a nested structure."""
    if isinstance(obj, dict):
        return {k: _replace_placeholders_recursive(v, replacements) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_replace_placeholders_recursive(item, replacements) for item in obj]
    elif isinstance(obj, str):
        # Check if the entire string is a placeholder
        if obj.startswith("{") and obj.endswith("}"):
            key = obj[1:-1]
            if key in replacements:
                # Return the value with proper type conversion
                return _convert_value_type(replacements[key])
        
        # Replace inline placeholders in the string
        result = obj
        for key, value in replacements.items():
            pattern = f"{{{key}}}"
            if pattern in result:
                result = result.replace(pattern, str(value))
        
        return result
    else:
        return obj


def get_template_by_id(
    template_id: str,
    category: str = None,
    category_label: str = None,
    limit: int = None,
    filter_field: str = None,
    filter_operator: str = None,
    filter_value: str | bool | int = None,
    number_of_themes: int = None,
    sort_field: str = None,
    descending: bool = None
) -> WorkflowTemplate | None:
    """
    Get a workflow template by ID with placeholder replacements.
    
    Args:
        template_id: The template ID to retrieve
        category: Value to replace {category} placeholder (e.g., "shoes", "headphones")
        category_label: Value to replace {category_label} placeholder (e.g., "Shoe", "Headphone")
        limit: Value to replace {limit} placeholder (e.g., 1, "123")
        filter_field: Value to replace {filter_field} placeholder (e.g., "star_rating")
        filter_operator: Value to replace {filter_operator} placeholder (e.g., "greater", "equals")
        filter_value: Value to replace {filter_value} placeholder (e.g., 1, "123")
        sort_field: Value to replace {sort_field} placeholder (e.g., "star_rating")
        descending: Value to replace {descending} placeholder (bool: True/False)
    
    Returns:
        WorkflowTemplate with placeholders replaced, or None if not found
    """
    template = next((t for t in WORKFLOW_TEMPLATES if t["id"] == template_id), None)
    
    if not template:
        return None
    
    # Create deep copy to avoid modifying original
    template_copy = copy.deepcopy(template)
    
    # Build replacements dict
    replacements = {}
    if category is not None:
        replacements["category"] = category
    if category_label is not None:
        replacements["category_label"] = category_label
    elif category is not None:
        # Auto-generate label from category if not provided
        replacements["category_label"] = category.capitalize()
    if limit is not None:
        replacements["limit"] = limit
    if filter_field is not None:
        replacements["filter_field"] = filter_field
    if filter_operator is not None:
        replacements["filter_operator"] = filter_operator
    if filter_value is not None:
        replacements["filter_value"] = filter_value
    if number_of_themes is not None:
        replacements["number_of_themes"] = number_of_themes
    if sort_field is not None:
        replacements["sort_field"] = sort_field
    if descending is not None:
        replacements["descending"] = "true" if descending else "false"
    
    # Replace placeholders
    if replacements:
        template_copy = _replace_placeholders_recursive(template_copy, replacements)
    
    return template_copy


def get_all_templates() -> List[WorkflowTemplate]:
    """Get all available workflow templates (with placeholders intact)."""
    return WORKFLOW_TEMPLATES