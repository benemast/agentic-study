// frontend/src/config/icons.js
// centralized icon mapping
import { 
  Plus, 
  Database, 
  Filter, 
  BarChart3, 
  Brain, 
  Download, 
  Merge, 
  Split,
  Settings,
  Save,
  RotateCcw,
  Play,
  Edit3,
  Trash2,
  Construction,
  BrushCleaning,
  ArrowDownNarrowWide,
  GitBranch,
  Sparkles,
  FileOutput,
  FileInput,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react';
import React from 'react';

export const ICONS = {
  Database:             { component: Database },
  Filter:               { component: Filter },
  BarChart3:            { component: BarChart3 },
  Brain:                { component: Brain },
  Download:             { component: Download },
  Merge:                { component: Merge, style: { transform: 'rotate(180deg)' } },
  Split:                { component: Split, style: { transform: 'rotate(180deg)' } },
  Plus:                 { component: Plus },
  Settings:             { component: Settings },
  Save:                 { component: Save },
  RotateCcw:            { component: RotateCcw },
  Play:                 { component: Play },
  Edit3:                { component: Edit3 },
  Trash2:               { component: Trash2 },
  Construction:         { component: Construction },
  BrushCleaning:        { component: BrushCleaning },
  ArrowDownNarrowWide:  { component: ArrowDownNarrowWide },
  GitBranch:            { component: GitBranch },
  Sparkles:             { component: Sparkles },
  FileOutput:           { component: FileOutput },
  FileInput:            { component: FileInput },
  ChevronLeft:          { component: ChevronLeft },
  ChevronRight:         { component: ChevronRight },
  ChevronDown:          { component: ChevronDown },
  ChevronUp:            { component: ChevronUp },
  Lock:                 { component: Lock },
};

// Helper function to get icon configuration
export const getIcon = (iconName, fallback = 'Database') => {
  return ICONS[iconName] || ICONS[fallback];
};

// Helper function to render icon with props and styles
export const renderIcon = (iconName, props = {}, fallback = 'Database') => {
  const icon = getIcon(iconName, fallback);
  const IconComponent = icon.component;
  
  if (!IconComponent) return null;
  
  // Merge the icon's default style with any provided style
  const combinedStyle = {
    ...icon.style,
    ...props.style
  };
  
  const combinedProps = {
    ...props,
    style: combinedStyle
  };
  
  return React.createElement(IconComponent, combinedProps);
};

// Legacy compatibility - keeping ICON_COMPONENTS for existing code
export const ICON_COMPONENTS = Object.fromEntries(
  Object.entries(ICONS).map(([key, value]) => [key, value.component])
);

// Updated helper function for backward compatibility
export const getIconComponent = (iconName, fallback = Database) => {
  const icon = getIcon(iconName, 'Database');
  return icon.component || fallback;
};