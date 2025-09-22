import React, { useState, useEffect, useCallback, memo } from 'react';

const NodeEditor = memo(({ node, isOpen, onClose, onSave, workflowState }) => {
  const [editedNode, setEditedNode] = useState(node || {});

  useEffect(() => {
    setEditedNode(node || {});
  }, [node]);

  const handleSave = useCallback(() => {
    onSave(editedNode);
    workflowState?.trackInteraction?.('node_edited', { 
      nodeId: editedNode.id, 
      changes: { label: editedNode.data?.label } 
    });
    onClose();
  }, [editedNode, onSave, onClose, workflowState]);

  const handleInputChange = useCallback((field, value) => {
    setEditedNode(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value }
    }));
  }, []);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen || !node) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 w-80">
        <h3 className="text-lg font-semibold mb-4">Edit Node</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <input
              type="text"
              value={editedNode.data?.label || ''}
              onChange={(e) => handleInputChange('label', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={editedNode.data?.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
});

NodeEditor.displayName = 'NodeEditor';
export default NodeEditor;