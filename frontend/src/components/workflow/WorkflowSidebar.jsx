// frontend/src/components/workflow/WorkflowSidebar.jsx
import React, { memo, useMemo } from 'react';
import { NODE_TEMPLATES } from '../../constants/nodeTemplates';
import { renderIcon, ICONS } from '../../constants/icons';
import { useTranslation } from '../../hooks/useTranslation';
import { 
  getNodeTranslationKey, 
  getNodeTypeTranslationKey,
  getCategoryTranslationKey 
} from '../../utils/translationHelpers';

const Sidebar = memo(({ showNodePanel, setShowNodePanel, onDragStart, onNodeAdd }) => {
  const { t } = useTranslation();
  
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

  const PlusIcon = ICONS.Plus.component;

  if (!showNodePanel) {
    return (
      <div className="bg-white border-r border-gray-200 w-16 h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setShowNodePanel(true)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            title={t('workflow.builder.addNodes')}
          >
            <PlusIcon size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-r border-gray-200 w-80 transition-all duration-300 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setShowNodePanel(false)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <PlusIcon size={20} />
          <span className="font-medium">{t('workflow.builder.addNodes')}</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {Object.entries(categorizedNodes).map(([category, nodes]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                {t(getCategoryTranslationKey(category))}
              </h3>
              <div className="space-y-2">
                {nodes.map((node) => {
                  const nodeIcon = renderIcon(node.icon, { size: 16, className: "text-white" });
                  
                  // Get translated node name and type using helper functions
                  const translatedNodeName = t(getNodeTranslationKey(node.id));
                  const translatedNodeType = t(getNodeTypeTranslationKey(node.type));
                  
                  return (
                    <div
                      key={node.id}
                      draggable
                      onDragStart={(e) => {
                        if (onDragStart) {
                          onDragStart(e, node);
                        }
                      }}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-grab hover:bg-gray-100 active:cursor-grabbing transition-colors"
                      title={t('workflow.builder.dragToAdd')}
                    >
                      <div className={`p-2 rounded ${node.color}`}>
                        {nodeIcon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {translatedNodeName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {translatedNodeType}
                        </p>
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
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;