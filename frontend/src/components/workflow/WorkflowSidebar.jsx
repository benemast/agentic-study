// frontend/src/components/workflow/WorkflowSidebar.jsx
import React, { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { NODE_TEMPLATES } from '../../config/nodeTemplates';
import { renderIcon, ICONS } from '../../config/icons';
import { useTranslation } from '../../hooks/useTranslation';
import { 
  getNodeTranslationKey, 
  getNodeTypeTranslationKey,
  getCategoryTranslationKey 
} from '../../utils/translationHelpers';

const Sidebar = memo(({ showNodePanel, setShowNodePanel, onDragStart, onNodeAdd, nodes = [] }) => {
  const { t } = useTranslation();
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 });
  const sidebarRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  
  // Calculate node usage counts
  const nodeUsageCounts = useMemo(() => {
    const counts = {};
    nodes.forEach(node => {
      const templateId = node.data?.template_id;
      if (templateId) {
        counts[templateId] = (counts[templateId] || 0) + 1;
      }
    });
    return counts;
  }, [nodes]);
  
  // Check if a node is at max capacity
  const isNodeLocked = useCallback((nodeTemplate) => {
    if (!nodeTemplate.maxAllowed) return false;
    const currentCount = nodeUsageCounts[nodeTemplate.id] || 0;
    return currentCount >= nodeTemplate.maxAllowed;
  }, [nodeUsageCounts]);
  
  const categorizedNodes = useMemo(() => {
    const categories = {};
    NODE_TEMPLATES.forEach(node => {
      if (!categories[node.category]) {
        categories[node.category] = [];
      }
      categories[node.category].push(node);
    });
    return categories;
  }, []);

  // Icons
  const ChevronLeftIcon = ICONS.ChevronLeft.component;
  const ChevronRightIcon = ICONS.ChevronRight.component;
  const LockIcon = ICONS.Lock?.component; // Add Lock icon if not present
  
  const handleMouseEnter = (nodeId, event) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const nodeRect = event.currentTarget.getBoundingClientRect();
    const sidebarRect = sidebarRef.current?.getBoundingClientRect();
    
    if (sidebarRect) {
      // Position tooltip to the right of the sidebar
      setTooltipPosition({
        left: sidebarRect.right + 8, // 8px gap from sidebar
        top: nodeRect.top
      });
    }
    
    // Add 500ms delay before showing tooltip
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNode(nodeId);
    }, 500);
  };

  const handleMouseLeave = () => {
    // Clear timeout if mouse leaves before tooltip shows
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredNode(null);
  };

  // Update tooltip position on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (hoveredNode) {
        setHoveredNode(null);
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };

    const scrollContainer = sidebarRef.current?.querySelector('.overflow-y-auto');
    scrollContainer?.addEventListener('scroll', handleScroll);
    
    return () => {
      scrollContainer?.removeEventListener('scroll', handleScroll);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [hoveredNode]);

  // Collapsed state
  if (!showNodePanel) {
    return (
      <div 
        data-tour="workflow-sidebar"
        className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-16 h-full flex flex-col transition-all duration-300"
        >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={() => setShowNodePanel(true)}
            className="flex items-center justify-center w-full text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            title={t('workflow.builder.addNodes')}
          >
            <ChevronRightIcon size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded state

  return (
    <>
      <div 
        ref={sidebarRef}
        className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-80 transition-all duration-300 h-full flex flex-col relative z-20"
        data-tour="workflow-sidebar"
      >
        {/* Header with collapse button */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={() => setShowNodePanel(false)}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 w-full group"
          >
            <ChevronLeftIcon size={20} className="flex-shrink-0" />
            <span className="font-medium flex-1 text-left">{t('workflow.builder.addNodes')}</span>
          </button>
        </div>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {Object.entries(categorizedNodes).map(([category, categoryNodes]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                  {t(getCategoryTranslationKey(category))}
                </h3>
                <div className="space-y-2">
                  {categoryNodes.map((node) => {
                    const nodeIcon = renderIcon(node.icon, { size: 16, className: "text-white" });
                    
                    // Get translations for this node
                    const nodeTranslations = t(getNodeTranslationKey(node.id));
                    const translatedNodeName = nodeTranslations?.label || node.label;
                    const translatedNodeType = nodeTranslations?.type || node.type;
                    const translatedDescription = nodeTranslations?.description || '';
                    
                    // Check if node is locked
                    const locked = isNodeLocked(node);
                    const currentCount = nodeUsageCounts[node.id] || 0;
                    
                    return (
                      <div
                        key={node.id}
                        draggable={!locked}
                        onDragStart={(e) => {
                          if (locked) {
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                          }
                          // Clear timeout and hide tooltip when dragging starts
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = null;
                          }
                          setHoveredNode(null);
                          if (onDragStart) {
                            onDragStart(e, node);
                          }
                        }}
                        onMouseDown={(e) => {
                          // Prevent mouse down if locked
                          if (locked) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        onMouseEnter={(e) => handleMouseEnter(node.id, e)}
                        onMouseLeave={handleMouseLeave}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          locked
                            ? 'bg-gray-100 dark:bg-gray-700/30 cursor-not-allowed opacity-60'
                            : 'bg-gray-50 dark:bg-gray-700/50 cursor-grab hover:bg-gray-100 dark:hover:bg-gray-700 active:cursor-grabbing'
                        }`}
                      >
                        <div className={`p-2 rounded ${node.color} relative`}>
                          {nodeIcon}
                          {locked && (
                            <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            locked ? 'text-gray-500 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'
                          }`}>
                            {translatedNodeName}
                          </p>
                          <p className={`text-xs ${
                            locked ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {translatedNodeType}
                          </p>
                          {node.maxAllowed && (
                            <p className={`text-xs mt-1 ${
                              locked ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'
                            }`}>
                              {currentCount}/{node.maxAllowed} {t('workflow.builder.sidebar.used')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip Portal - Distinct light and dark mode designs */}
      {hoveredNode && (
        <div 
          className="fixed w-72 p-4 rounded-xl shadow-2xl pointer-events-none z-[9999] animate-in fade-in duration-150
                     bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800
                     border-2 border-gray-200 dark:border-gray-600
                     backdrop-blur-sm"
          style={{ 
            left: `${tooltipPosition.left}px`,
            top: `${tooltipPosition.top}px`,
          }}
        >
          {(() => {
            const node = NODE_TEMPLATES.find(n => n.id === hoveredNode);
            if (!node) return null;
            
            const nodeTranslations = t(getNodeTranslationKey(node.id));
            const translatedNodeName = nodeTranslations?.label || node.label;
            const translatedDescription = nodeTranslations?.description || '';
            const locked = isNodeLocked(node);
            const currentCount = nodeUsageCounts[node.id] || 0;
            
            return (
              <>
                {/* Header with icon badge */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${node.color} shadow-md flex-shrink-0`}>
                    {renderIcon(node.icon, { 
                      size: 20, 
                      className: "text-white",
                      strokeWidth: 2.5
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                      {translatedNodeName}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                      {nodeTranslations?.type || node.type}
                    </p>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mb-3"></div>
                
                {/* Description */}
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {translatedDescription}
                </p>
                
                {/* Tooltip arrow - Light mode */}
                <div className="absolute top-4 -left-[9px] w-4 h-4 bg-white border-l-2 border-t-2 border-gray-200 transform rotate-45 dark:hidden"></div>
                
                {/* Tooltip arrow - Dark mode */}
                <div className="hidden dark:block absolute top-4 -left-[9px] w-4 h-4 bg-gradient-to-br from-gray-900 to-gray-800 border-l-2 border-t-2 border-gray-600 transform rotate-45"></div>
                
                {/* Decorative corner accent - light mode only */}
                <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-blue-50 to-transparent rounded-xl opacity-50 dark:hidden"></div>
                
                {/* Decorative glow - dark mode only */}
                <div className="hidden dark:block absolute -inset-1 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-xl blur -z-10"></div>


                {/* MaxAllowed warning */}
                {node.maxAllowed && (
                  <div className={`mt-3 pt-3 border-t ${
                    locked 
                      ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                  } rounded-lg p-2`}>
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" 
                           stroke="currentColor" 
                           className={locked ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}
                           strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <p className={`text-xs font-medium ${
                        locked 
                          ? 'text-red-700 dark:text-red-300' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {locked 
                          ? t('workflow.builder.sidebar.maxReached', { max: node.maxAllowed })
                          : t('workflow.builder.sidebar.maxAllowed', { current: (currentCount || 0), max: node.maxAllowed })
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Note if exists */}
                {nodeTranslations?.note && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      {nodeTranslations.note}
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;