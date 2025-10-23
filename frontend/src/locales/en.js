// frontend/src/locales/en.js
export const en = {
  common: {
    form: {
      pleaseSelect: 'Please select...',
      required: 'This field is required',
      optional: '(optional)'
    },
    
    validation: {
      required: 'This field is required',
      pleaseFillRequired: 'Please fill in all required fields before continuing',
      invalidEmail: 'Please enter a valid email address',
      minLength: 'Must be at least {{min}} characters',
      maxLength: 'Must be at most {{max}} characters',
      numberOnly: 'Please enter numbers only'
    },
    
    navigation: {
      previous: 'Previous',
      next: 'Next',
      continue: 'Continue',
      back: 'Back',
      submit: 'Submit',
      cancel: 'Cancel',
      save: 'Save',
      close: 'Close'
    }
  },
  base:{
    university: {
      name: "Technical University of Darmstadt",
      chair: "Chair of Information Systems | Software & AI Business"
    }
  },
  footer: {
    legalNote: {
      label: "Legal note",
      url: "https://www.tu-darmstadt.de/impressum/index.en.jsp"
    },
    note:"The study takes approximately 45-60 minutes. Your progress is automatically saved.",
    contact: "For study questions or issues, please contact [EMAIL]"
  },
  // ========================================
  // WELCOME SCREEN (NEW)
  // ========================================
  welcome: {
    title: "Welcome to the User Study",
    subtitle: "Research on Agentic AI Workflow Design",
    description: "Help us understand how people interact and collaborate with different AI systems.",
    
    whatYouWillDo: {
      title: "What to expect:",
      explore: "Explore two different AI-powered work environments",
      create: "Create workflows or work with an AI Assistant",
      test: "Test and iterate on your solutions",
      complete: "Share your experiences through brief surveys"
    },
    
    duration: {
      label: "Duration",
      value: "45-60 minutes"
    },

    legalNote: {
      lable: "Legal note"

    },
    
    privacy: {
      label: "Privacy",
      value: "Anonymous & GDPR-compliant",
      url: "https://www.tu-darmstadt.de/datenschutzerklaerung.en.jsp"
    },
    
    privacyNotice: {
      title: "Data Privacy Notice",
      intro: "Your participation in this study is completely voluntary and anonymous. We collect the following data:",
      data1: "Demographic information (without personal identifiers)",
      data2: "Interaction patterns and usage behavior",
      data3: "Workflow designs and feedback",
      gdpr: "All data is processed in accordance with GDPR and used solely for research purposes. You can withdraw from the study at any time without providing reasons.",
      viewFull: "View full privacy policy"
    },

    privacyModal: {
      title: "Privacy Policy",
      content: "Detailed information about data protection can be found in our full privacy policy at: ",
      close: "Close"
    },
    
    consent: {
      title: "I consent to participate",
      text: "I have read and understood the study information and privacy notice. I voluntarily participate in this study and know that I can withdraw at any time without providing reasons."
    },
    
    continue: "Continue to Study"
  },
  workflow: {
    builder: {
      title: "Research Workflow",
      addNode: "Add Node",
      addNodes: "Add Nodes",
      dragToAdd: "Drag to canvas to add",
      nodeCategories: {
        input: "input",
        processing: "processing", 
        logic: "logic",
        analysis: "analysis",
        ai: "ai",
        output: "output"
      },
      nodes: {
        loadData: "Load Data",
        filterData: "Filter Data",
        cleanData: "Clean Data",
        sortData: "Sort Data",
        logicIf: "Logic If",
        combineData: "Combine Data",
        sentimentAnalysis: "Sentiment Analysis",
        generateInsights: "Generate Insights",
        showResults: "Show Results"
      },
      nodeTypes: {
        dataInput: "Data Input",
        dataProcessing: "Data Processing",
        conditional: "Conditional",
        analysis: "Analysis",
        aiOperation: "AI Operation",
        output: "Output"
      },
      toolbar: {
        save: "Save",
        clear: "Clear",
        settings: "Settings",
        execute: "Execute"
      },
      status: {
        ready: "Ready to execute",
        emptyWorkflow: "Empty workflow",
        missingInput: "Missing input node",
        missingOutput: "Missing output node",
        noConnections: "No connections",
        incompleteWorkflow: "Incomplete workflow"
      },
      statusDetails: {
        addNodes: "Add nodes to start building your workflow",
        addInput: "Add a data input node to start your workflow",
        addOutput: "Add an output node to complete your workflow",
        connectNodes: "Connect your nodes to create a workflow path",
        createPath: "Create a path from input to output nodes",
        nodesConnected: "{{count}} nodes connected properly"
      },
      emptyState: {
        title: "Start Building Your Workflow",
        description: "Drag and drop nodes from the sidebar to create your research automation workflow.",
        addFirstNode: "Add Your First Node"
      },
      connectionHelper: {
        connecting: "Drag to connect nodes • Green = Valid target • Gray = Invalid"
      },
      nodeEditor: {
        title: "Edit Node",
        label: "Label",
        description: "Description",
        cancel: "Cancel",
        save: "Save"
      }
    },
    sidebar: {
      dashboard: "Dashboard",
      builder: "Workflow Builder",
      aichat: "AI Assistant",
      templates: "Templates",
      executions: "Executions",
      analytics: "Analytics",
      tutorials: "Tutorials",
      settings: "Settings"
    },
    notifications: {
      nodeAdded: "Node added successfully",
      nodeDeleted: "Node deleted",
      nodeSaved: "Node saved",
      connectionAdded: "Connection created",
      connectionDeleted: "Connection removed",
      connectionFailed: "Cannot create connection",
      validationFailed: "Workflow validation failed",
      maxNodesReached: "Maximum number of nodes ({{max}}) reached",
      maxEdgesReached: "Maximum number of connections ({{max}}) reached",
      sourceHandleMaxReached: "Source handle already has maximum of {{max}} connection{{max === 1 ? '' : 's'}}",
      targetHandleMaxReached: "Target handle already has maximum of {{max}} connection{{max === 1 ? '' : 's'}}",
      workflowSaved: "Workflow saved: {{nodes}} nodes, {{connections}} connections",
      workflowExecuted: "Workflow executed with {{nodes}} nodes and {{connections}} connections",
      workflowCleared: "Workflow cleared"
    }
  },
  demographics: {
    progress: {
      step: 'Step {{current}} of {{total}}',
      complete: 'complete'
    },
    
    navigation: {
      readyToStart: 'Ready to start?',
      continueWhenReady: 'Continue when ready',
      almostDone: 'Almost done!',
      completeAndContinue: 'Complete & Continue'
    },
    
    privacyNote: 'All responses are anonymous and will be used for research purposes only. You can skip any optional questions you prefer not to answer.',
    
    basicInfo: {
      title: "Basic Information",
      description: 'Tell us a bit about yourself',
      age: {
        label: "Age Range",
        preferNotToSay: "Prefer not to say"
      },
      gender: {
        label: "Gender Identity",
        woman: "Woman",
        man: "Man",
        nonBinary: "Non-binary",
        other: "Other",
        preferNotToSay: "Prefer not to say"
      },
      education: {
        label: "Highest Level of Education",
        highSchool: "High school / Secondary education",
        someCollege: "Some college / university",
        bachelors: "Bachelor's degree",
        masters: "Master's degree",
        phd: "PhD / Doctoral degree",
        other: "Other"
      },
      fieldOfStudy: {
        label: "Field of Study",
        placeholder: "e.g., Computer Science, Psychology, Engineering, etc."
      },
      occupation: {
        label: "Current Occupation / Field",
        placeholder: "e.g., Software Engineer, Student, Researcher, etc."
      },
      country: {
        label: 'Country/Region (optional)',
        placeholder: 'e.g., Germany, United States, Brazil, etc.'
      },
      
      firstLanguage: {
        label: 'Native Language (optional)',
        placeholder: 'e.g., German, English, Spanish, Mandarin, etc.'
      }
    },
    technicalBackground: {
      title: 'Technical Background',
      description: 'Help us understand your technical experience',
      
      programming: {
        label: 'Programming Experience',
        none: 'No programming experience',
        beginner: 'Beginner (< 1 year)',
        intermediate: 'Intermediate (1-3 years)',
        advanced: 'Advanced (3-7 years)',
        expert: 'Expert (7+ years)'
      },
      
      aiMl: {
        label: 'AI/ML Experience',
        none: 'No AI/ML experience',
        beginner: 'Beginner - some exposure/learning',
        intermediate: 'Intermediate - built some AI/ML projects',
        advanced: 'Advanced - professional AI/ML work',
        expert: 'Expert - AI/ML specialist/researcher'
      },
      
      workflowTools: {
        label: 'Workflow/Automation Tools Used (select all that apply)',
        other: 'Other',
        none: 'None of these'
      },
      
      technicalRole: {
        label: 'Best Describes Your Technical Role',

        developer: "Software Developer/Engineer",
        devopsEngineer: 'DevOps Engineer',
        dataScientist: "Data Scientist/Analyst",
        researcher: "Academic/Industry Researcher",
        proManager: 'Product/Project Manager',
        designer: "UX/UI Designer",
        student: 'Student',
        businessAnalyst: 'Business Analyst',
        qaEngineer: 'QA/Test Engineer',
        systemArchitect: 'System/Solution Architect',
        consultant: 'Consultant',
        entrepreneur: 'Entrepreneur/Founder',
        otherTechnical: 'Other Technical Role',
        nonTechnical: 'Non-technical Role'
      },
      
      comments: {
        label: 'Additional Comments (optional)',
        placeholder: 'Any other information you would like to share, or questions about the study...'
      }
    },
    opstudyContext: {
      title: 'Study Context',
      
      motivation: {
        label: 'What motivated you to participate in this study?',
        placeholder: 'e.g., Interest in AI, research participation, learning about workflow tools...'
      },
      
      expectations: {
        label: 'What do you hope to learn or experience?',
        placeholder: 'Your expectations about the study and workflow builder...'
      },
      
      timeAvailability: {
        label: 'How much time do you have available today?',
        short: '15-30 minutes',
        medium: '30-45 minutes',
        long: '45-60 minutes',
        veryLong: 'More than 60 minutes',
        flexible: 'Flexible - I can pause and continue later'
      }
    },
    
    optionalInfo: {
      title: 'Optional Information',
      
      country: {
        label: 'Country/Region (optional)',
        placeholder: 'e.g., Germany, United States, etc.'
      },
      
      firstLanguage: {
        label: 'Native Language (optional)',
        placeholder: 'e.g., German, English, Spanish, etc.'
      },
      
      comments: {
        label: 'Additional Comments (optional)',
        placeholder: 'Any other information you would like to share, or questions about the study...'
      }
    }
  }
};