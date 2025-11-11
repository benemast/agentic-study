// SummaryModal.jsx
/**
 * Professional Summary Document Modal
 * 
 * Displays task execution results in a professional briefing format
 * Supports 5 sections: executive_summary, themes, recommendations, statistics, data_preview
 * Handles missing sections gracefully
 * Professional styling suitable for manager-level briefings
 */

import React, { useEffect } from 'react';
import { X, FileText, TrendingUp, Target, BarChart3, Database } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

const SummaryModal = ({ isOpen, onClose, summaryData, taskNumber }) => {
  const { t } = useTranslation();
  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !summaryData) return null;

  const { sections, metadata } = summaryData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {t('summary.modal.title', { taskNumber })}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('summary.modal.subtitle', { 
                  count: metadata?.total_records || 0, 
                  date: new Date(metadata?.processed_at || Date.now()).toLocaleString() 
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t('summary.modal.close')}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-8">
            {/* Executive Summary */}
            {sections.executive_summary?.available && (
              <ExecutiveSummarySection data={sections.executive_summary.content} />
            )}

            {/* Themes */}
            {sections.themes?.available && (
              <ThemesSection data={sections.themes.content} />
            )}

            {/* Recommendations */}
            {sections.recommendations?.available && (
              <RecommendationsSection data={sections.recommendations.content} />
            )}

            {/* Statistics */}
            {sections.statistics?.available && (
              <StatisticsSection data={sections.statistics.content} />
            )}

            {/* Data Preview */}
            {sections.data_preview?.available && (
              <DataPreviewSection data={sections.data_preview.content} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div>
              {t('summary.modal.footer', { 
                available: metadata?.sections_available?.length || 0, 
                requested: metadata?.sections_requested?.length || 0 
              })}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {t('summary.modal.closeButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SECTION COMPONENTS
// ============================================================

const ExecutiveSummarySection = ({ data }) => {
  const { t } = useTranslation();
  
  return (
    <section className="space-y-3">
      <SectionHeader 
        icon={<FileText className="w-5 h-5" />}
        title={t('summary.sections.executiveSummary.title')}
      />
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="space-y-2">
          {data.summary?.map((item, index) => (
            <p key={index} className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {item}
            </p>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 text-sm text-gray-600 dark:text-gray-400">
          {t('summary.sections.executiveSummary.basedOn', { count: data.record_count?.toLocaleString() || 0 })}
        </div>
      </div>
    </section>
  );
};

const ThemesSection = ({ data }) => {
  const { t } = useTranslation();
  
  // Helper to determine dominant sentiment for a theme
  const getThemeSentiment = (theme) => {
    // If theme has sentiment property from backend
    if (theme.sentiment) return theme.sentiment;
    
    // If theme has sentiment_breakdown
    if (theme.sentiment_breakdown) {
      const breakdown = theme.sentiment_breakdown;
      const max = Math.max(
        breakdown.positive || 0,
        breakdown.neutral || 0,
        breakdown.negative || 0
      );
      if (breakdown.positive === max) return 'positive';
      if (breakdown.negative === max) return 'negative';
      return 'neutral';
    }
    
    // Default if no sentiment info
    return null;
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      positive: {
        gradient: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-600 dark:text-green-400',
        bar: 'from-green-500 to-emerald-500'
      },
      neutral: {
        gradient: 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-600 dark:text-gray-400',
        bar: 'from-gray-500 to-slate-500'
      },
      negative: {
        gradient: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-600 dark:text-red-400',
        bar: 'from-red-500 to-rose-500'
      },
      default: {
        gradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-600 dark:text-blue-400',
        bar: 'from-blue-500 to-indigo-500'
      }
    };
    return colors[sentiment] || colors.default;
  };
  
  return (
    <section className="space-y-3">
      <SectionHeader 
        icon={<TrendingUp className="w-5 h-5" />}
        title={t('summary.sections.themes.title')}
      />

      {/* PRIMARY: Themes by Sentiment (if available) - Shows FIRST */}
      {data.themes_by_sentiment && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              {t('summary.sections.themes.bySentiment')}
            </h4>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Positive Themes */}
            {data.themes_by_sentiment.positive_themes?.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                  <SentimentBadge sentiment="positive" />
                  {t('summary.sections.themes.positive')} ({data.themes_by_sentiment.positive_themes.length})
                </h5>
                <div className="space-y-2">
                  {data.themes_by_sentiment.positive_themes.slice(0, 5).map((theme, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{theme.theme}</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">{theme.percentage?.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Neutral Themes */}
            {data.themes_by_sentiment.neutral_themes?.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900/10 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <SentimentBadge sentiment="neutral" />
                  {t('summary.sections.themes.neutral')} ({data.themes_by_sentiment.neutral_themes.length})
                </h5>
                <div className="space-y-2">
                  {data.themes_by_sentiment.neutral_themes.slice(0, 5).map((theme, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{theme.theme}</span>
                        <span className="text-gray-600 dark:text-gray-400 font-semibold">{theme.percentage?.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Negative Themes */}
            {data.themes_by_sentiment.negative_themes?.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
                  <SentimentBadge sentiment="negative" />
                  {t('summary.sections.themes.negative')} ({data.themes_by_sentiment.negative_themes.length})
                </h5>
                <div className="space-y-2">
                  {data.themes_by_sentiment.negative_themes.slice(0, 5).map((theme, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{theme.theme}</span>
                        <span className="text-red-600 dark:text-red-400 font-semibold">{theme.percentage?.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECONDARY: Aggregated Themes - Shows AFTER by-sentiment (or as primary if no by-sentiment) */}
      <div className={data.themes_by_sentiment ? "mt-8 pt-8 border-t-2 border-gray-200 dark:border-gray-700" : ""}>
        {data.themes_by_sentiment && (
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              {t('summary.sections.themes.aggregated')}
            </h4>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.themes?.map((theme, index) => {
            const sentiment = getThemeSentiment(theme);
            const colors = getSentimentColor(sentiment);
            
            return (
              <div 
                key={index}
                className={`bg-gradient-to-br ${colors.gradient} border-2 ${colors.border} rounded-xl p-5 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight flex-1">
                    {theme.theme}
                  </h4>
                  {sentiment && (
                    <SentimentBadge sentiment={sentiment} />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('summary.sections.themes.prevalence')}
                    </span>
                    <span className={`text-2xl font-bold ${colors.text}`}>
                      {theme.percentage?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`bg-gradient-to-r ${colors.bar} h-full rounded-full transition-all`}
                      style={{ width: `${theme.percentage || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t('summary.sections.themes.mentions', { count: theme.estimated_total_count?.toLocaleString() || 0 })}
                    </span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      #{index + 1}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
        {t('summary.sections.themes.summary', { 
          totalThemes: data.total_themes, 
          recordsAnalyzed: data.records_analyzed?.toLocaleString() || 0 
        })}
      </div>
    </section>
  );
};

const RecommendationsSection = ({ data }) => {
  const { t } = useTranslation();
  
  const priorityColors = {
    high: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',
    medium: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
    low: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
  };

  const priorityBadgeColors = {
    high: 'bg-red-600 text-white',
    medium: 'bg-amber-600 text-white',
    low: 'bg-blue-600 text-white'
  };

  
  const total = data.total_recommendations
  const highPriority = data.high_priority_count || 0

  // Group recommendations by category
  const groupedRecs = {};
  data.recommendations?.forEach(rec => {
    if (!groupedRecs[rec.category]) {
      groupedRecs[rec.category] = [];
    }
    groupedRecs[rec.category].push(rec);
  });

  return (
    <section className="space-y-3">
      <SectionHeader 
        icon={<Target className="w-5 h-5" />}
        title={t('summary.sections.recommendations.title')}
      />
      
      {/* Group by category */}
      {Object.entries(groupedRecs).map(([category, recs]) => (
        <div key={category} className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            {category.replace(/_/g, ' ')}
          </h4>
          <div className="space-y-2 pl-2">
            {recs.map((rec, index) => (
              <div 
                key={index}
                className={`border rounded-lg p-3 ${priorityColors[rec.priority] || priorityColors.medium}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase ${priorityBadgeColors[rec.priority] || priorityBadgeColors.medium}`}>
                      {rec.priority}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm mb-1.5 text-gray-900 dark:text-gray-100">
                      {rec.recommendation}
                    </p>
                    {rec.impact && rec.impact !== 'Based on analysis of customer review data' && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('summary.sections.recommendations.impact')}: {rec.impact}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        {t('summary.sections.recommendations.totalCount', { 
          count: data.total_recommendations 
        })}
        {' • '}
        {t('summary.sections.recommendations.highPriorityCount', { 
          count: data.high_priority_count || 0 
        })}
      </div>
    </section>
  );
};

const StatisticsSection = ({ data }) => {
  const { t } = useTranslation();
  const stats = data.statistics;
  
  return (
    <section className="space-y-3">
      <SectionHeader 
        icon={<BarChart3 className="w-5 h-5" />}
        title={t('summary.sections.statistics.title')}
      />
      
      {/* Sentiment Distribution */}
      {stats.sentiment_distribution?.available && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Sentiment Distribution
          </h4>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(stats.sentiment_distribution.distribution).map(([sentiment, data]) => (
              <div key={sentiment} className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.count?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {sentiment}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {data.percentage?.toFixed(1) || 0}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating Distribution */}
      {stats.rating_distribution?.available && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Rating Distribution
          </h4>
          <div className="space-y-2">
            <div className="text-center mb-3">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.rating_distribution.average_rating?.toFixed(2) || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Average Rating
              </div>
            </div>
            <div className="space-y-1.5">
              {Object.entries(stats.rating_distribution.distribution)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([rating, data]) => (
                  <div key={rating} className="flex items-center gap-2">
                    <div className="w-12 text-sm text-gray-600 dark:text-gray-400">
                      {rating} ★
                    </div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                      <div 
                        className="bg-blue-600 dark:bg-blue-500 h-full flex items-center justify-end pr-2"
                        style={{ width: `${data.percentage || 0}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {data.percentage?.toFixed(1) || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="w-12 text-sm text-gray-600 dark:text-gray-400 text-right">
                      {data.count?.toLocaleString() || 0}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Theme Coverage - Visual Overview */}
      {stats.theme_coverage?.available && stats.theme_coverage.top_themes?.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Top Themes Identified
          </h4>
          <div className="space-y-2">
            {stats.theme_coverage.top_themes.map((theme, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {theme}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  #{index + 1}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {stats.theme_coverage.total_themes_identified} total themes identified
          </div>
        </div>
      )}

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.review_summary?.available && (
          <>
            <StatCard 
              label="Total Reviews"
              value={stats.review_summary.total_reviews?.toLocaleString() || 0}
            />
            <StatCard 
              label="Verified"
              value={`${stats.verified_rate?.verified_percentage?.toFixed(1) || 0}%`}
            />
            <StatCard 
              label="Avg Body Length"
              value={Math.round(stats.review_summary.avg_review_body_length || 0)}
            />
            <StatCard 
              label="Consistency"
              value={`${stats.sentiment_consistency?.consistency_percentage?.toFixed(1) || 100}%`}
            />
          </>
        )}
      </div>

      {/* Sentiment Consistency with Patterns - ENHANCED */}
      {stats.sentiment_consistency?.available && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Sentiment-Rating Consistency
          </h4>
          <div className="space-y-4">
            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.sentiment_consistency.total_compared?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Compared
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.sentiment_consistency.aligned_count?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Aligned
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.sentiment_consistency.misaligned_count?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Misaligned
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.sentiment_consistency.consistency_percentage?.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Consistency
                </div>
              </div>
            </div>

            {/* Misalignment Patterns */}
            {stats.sentiment_consistency.misalignment_patterns && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Misalignment Patterns
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {stats.sentiment_consistency.misalignment_patterns.high_rating_negative > 0 && (
                    <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                      <span className="text-xs text-gray-700 dark:text-gray-300">High Rating + Negative</span>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                        {stats.sentiment_consistency.misalignment_patterns.high_rating_negative}
                      </span>
                    </div>
                  )}
                  {stats.sentiment_consistency.misalignment_patterns.low_rating_positive > 0 && (
                    <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                      <span className="text-xs text-gray-700 dark:text-gray-300">Low Rating + Positive</span>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {stats.sentiment_consistency.misalignment_patterns.low_rating_positive}
                      </span>
                    </div>
                  )}
                  {stats.sentiment_consistency.misalignment_patterns.neutral_extremes > 0 && (
                    <div className="flex justify-between items-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                      <span className="text-xs text-gray-700 dark:text-gray-300">Neutral Rating + Extremes</span>
                      <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                        {stats.sentiment_consistency.misalignment_patterns.neutral_extremes}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {stats.sentiment_consistency.note && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic">
              {stats.sentiment_consistency.note}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const DataPreviewSection = ({ data }) => {
  const { t } = useTranslation();
  const [expandedRows, setExpandedRows] = React.useState(new Set());
  
  const toggleRow = (index) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <section className="space-y-3">
      <SectionHeader 
        icon={<Database className="w-5 h-5" />}
        title={t('summary.sections.dataPreview.title')}
      />
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        {t('summary.sections.dataPreview.showing', {
          preview: data.preview_count || 0,
          total: data.total_records?.toLocaleString() || 0
        })}
      </div>
      
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t('summary.sections.dataPreview.columns.reviewId')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t('summary.sections.dataPreview.columns.headline')}
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t('summary.sections.dataPreview.columns.rating')}
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t('summary.sections.dataPreview.columns.sentiment')}
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t('summary.sections.dataPreview.columns.verified')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.records?.map((record, index) => (
                <React.Fragment key={record.review_id || index}>
                  <tr 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    onClick={() => toggleRow(index)}
                  >
                    <td className="px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                      {record.review_id?.substring(0, 12)}...
                    </td>
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                      {record.review_headline}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                        {record.star_rating} ★
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <SentimentBadge sentiment={record.sentiment} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {record.verified_purchase ? '✓' : '✗'}
                    </td>
                  </tr>
                  {expandedRows.has(index) && (
                    <tr className="bg-gray-50 dark:bg-gray-900/50">
                      <td colSpan="5" className="px-3 py-3">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <div className="font-medium mb-1">{t('summary.sections.dataPreview.reviewBody')}:</div>
                          <div className="text-xs leading-relaxed">
                            {record.review_body}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

// ============================================================
// HELPER COMPONENTS
// ============================================================

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
    <div className="text-blue-600 dark:text-blue-400">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
      {title}
    </h3>
  </div>
);

const StatCard = ({ label, value }) => (
  <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
      {value}
    </div>
    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
      {label}
    </div>
  </div>
);

const SentimentBadge = ({ sentiment }) => {
  const colors = {
    positive: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    negative: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${colors[sentiment] || colors.neutral}`}>
      {sentiment}
    </span>
  );
};

export default SummaryModal;