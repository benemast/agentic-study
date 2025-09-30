// frontend/src/locales/en.js
export const en = {
  common: {
    navigation: {
      previous: "Previous",
      next: "Next"
    },
    form: {
      pleaseSelect: "Please select..."
    },
    validation: {
      required: "This field is required"
    }
  },
  workflow: {
    builder: {
      title: "Research Workflow",
      addNodes: "Add Nodes",
      nodeCategories: {
        input: "INPUT",
        processing: "PROCESSING", 
        logic: "LOGIC",
        analysis: "ANALYSIS",
        ai: "AI",
        output: "OUTPUT"
      },
      nodes: {
        gatherData: "Gather Data",
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
      templates: "Templates",
      executions: "Executions",
      analytics: "Analytics",
      tutorials: "Tutorials",
      settings: "Settings"
    },
    notifications: {
      workflowSaved: "Workflow saved: {{nodes}} nodes, {{connections}} connections",
      workflowExecuted: "Workflow executed with {{nodes}} nodes and {{connections}} connections",
      workflowCleared: "Workflow cleared"
    }
  },
  demographics: {
    welcome: {
      title: "Welcome to the Agentic AI Study",
      subtitle: "Research on Agentic AI Workflow Design",
      description: "Welcome! You're participating in a research study exploring how people design and interact with agentic AI workflows using visual tools.",
      whatYouWillDo: {
        title: "What you'll do:",
        explore: "Explore our visual workflow builder interface",
        create: "Create AI agent workflows for various scenarios",
        test: "Test and iterate on your workflow designs",
        complete: "Complete tasks and provide feedback"
      },
      studyDetails: {
        title: "Study details:",
        duration: {
          label: "Duration:",
          value: "30-60 minutes (work at your own pace)"
        },
        privacy: {
          label: "Privacy:",
          value: "Anonymous - no personal identifiers collected"
        },
        data: {
          label: "Data:",
          value: "Only interaction patterns and workflow designs"
        },
        resumable: {
          label: "Resumable:",
          value: "Save your progress and continue later"
        }
      },
      beforeWeBegin: {
        title: "Before we begin:",
        description: "We'll ask a few quick questions about your background to help us understand our participants better. This helps us analyze how different experience levels approach agentic AI design."
      }
    },
    basicInfo: {
      title: "Basic Information",
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
      }
    },
    technicalBackground: {
      title: "Technical Background",
      programming: {
        label: "Programming Experience",
        none: "No programming experience",
        beginner: "Beginner (< 1 year)",
        intermediate: "Intermediate (1-3 years)",
        advanced: "Advanced (3-7 years)",
        expert: "Expert (7+ years)"
      },
      aiMl: {
        label: "AI/ML Experience",
        none: "No AI/ML experience",
        beginner: "Beginner - some exposure/learning",
        intermediate: "Intermediate - built some AI/ML projects",
        advanced: "Advanced - professional AI/ML work",
        expert: "Expert - AI/ML specialist/researcher"
      },
      workflowTools: {
        label: "Workflow/Automation Tools Used (select all that apply)",
        none: "None of these",
        other: "Other (please specify in comments)"
      },
      technicalRole: {
        label: "Best Describes Your Technical Role",
        developer: "Software Developer/Engineer",
        dataScientist: "Data Scientist/Analyst",
        researcher: "Academic/Industry Researcher",
        productManager: "Product Manager",
        designer: "UX/UI Designer",
        student: "Student",
        businessAnalyst: "Business Analyst",
        consultant: "Consultant",
        other: "Other",
        nonTechnical: "Non-technical role"
      }
    },
    studyContext: {
      title: "Study Context",
      motivation: {
        label: "What motivated you to participate in this study?",
        placeholder: "e.g., Interest in AI, research participation, learning about workflow tools..."
      },
      expectations: {
        label: "What do you hope to learn or experience?",
        placeholder: "Your expectations about the study and workflow builder..."
      },
      timeAvailability: {
        label: "How much time do you have available today?",
        short: "15-30 minutes",
        medium: "30-45 minutes",
        long: "45-60 minutes",
        veryLong: "More than 60 minutes",
        flexible: "Flexible - I can pause and resume"
      }
    },
    optionalInfo: {
      title: "Optional Information",
      country: {
        label: "Country/Region (optional)",
        placeholder: "e.g., United States, Germany, etc."
      },
      firstLanguage: {
        label: "First Language (optional)",
        placeholder: "e.g., English, Spanish, Mandarin, etc."
      },
      comments: {
        label: "Additional Comments (optional)",
        placeholder: "Any other information you'd like to share or questions about the study..."
      }
    },
    progress: {
      step: "Step {{current}} of {{total}}",
      complete: "complete"
    },
    navigation: {
      readyToStart: "Ready to get started?",
      continueWhenReady: "Continue when ready",
      almostDone: "Almost done!",
      submitting: "Submitting...",
      completeAndContinue: "Complete & Continue",
      startQuestionnaire: "Start Questionnaire"
    },
    privacyNote: "All responses are anonymous and used solely for research purposes. You can skip any optional questions you prefer not to answer."
  }
};