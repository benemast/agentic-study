// frontend/src/stores/workflowStore.js
import { create } from 'zustand'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'

export const useWorkflowStore = create((set, get) => ({
  nodes: [],
  edges: [],
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    })
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    })
  },
  
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    })
  },
}))