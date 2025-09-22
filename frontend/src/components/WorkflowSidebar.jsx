import React, { memo, useMemo } from 'react';
import { Plus, Database, Filter, BarChart3, Brain, Download } from 'lucide-react';
import { NODE_TEMPLATES } from '../constants/nodeTemplates';

const ICON_COMPONENTS = {
  Database,
  Filter, 
  BarChart3,
  Brain,
  Download,
};

const Sidebar = memo(({ showNodePanel, setShowNodePanel, onDragStart, workflowState }) => {
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

  if (!showNodePanel) {
    return (
      <div className="bg-white border-r border-gray-200 w-16">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setShowNodePanel(true)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            title="Show node panel"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-r border-gray-200 w-80 transition-all duration-300">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setShowNodePanel(false)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <Plus size={20} />
          <span className="font-medium">Add Nodes</span>
        </button>
      </div>
      
      <div className="p-4 space-y-6">
        {Object.entries(categorizedNodes).map(([category, nodes]) => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              {category}
            </h3>
            <div className="space-y-2">
              {nodes.map((node) => {
                const IconComponent = ICON_COMPONENTS[node.icon] || Database;
                
                return (
                  <div
                    key={node.id}
                    draggable
                    onDragStart={(e) => {
                      onDragStart(e, node);
                      workflowState?.trackInteraction?.('node_drag_started', { type: node.id });
                    }}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-grab hover:bg-gray-100 transition-colors"
                  >
                    <div className={`p-2 rounded ${node.color}`}>
                      <IconComponent size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{node.label}</p>
                      <p className="text-xs text-gray-500">{node.type}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;