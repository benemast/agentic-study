// frontend/src/locales/en.js
export const en = {
  // ========== COMMON ==========
  common: {
    form: {
      pleaseSelect: 'Please select...',
      selectOption: 'Please select...',
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
  // ========== BASE ==========
  base:{
    university: {
      name: 'Technical University of Darmstadt',
      chair: 'Chair of Information Systems | Software & AI Business'
    },
    studyConfig:{
      Error:{
        label: 'Configuration Error',
        text: 'Study configuration could not be loaded. Please reload the page.',
        reload: 'Reload'
      },
      init: 'Initializing study...'
    }
  },
  // ========== FOOTER ==========
  footer: {
    legalNote: {
      label: 'Legal note',
      url: 'https://www.tu-darmstadt.de/impressum/index.en.jsp'
    },
    note:'The study takes approximately 45-60 minutes. Your progress is automatically saved.',
    contact: 'For study questions or issues, please contact [EMAIL]'
  },
  // ========== WELCOME ==========
  welcome: {
    title: 'Welcome to the User Study',
    subtitle: 'Research on Agentic AI Workflow Design',
    description: 'Help us understand how people interact and collaborate with different AI systems.',
    
    whatYouWillDo: {
      title: 'What to expect:',
      explore: 'Explore two different AI-powered work environments',
      create: 'Create workflows or work with an AI Assistant',
      test: 'Test and iterate on your solutions',
      complete: 'Share your experiences through brief surveys'
    },
    studyInfo: {
      title: 'Study Information',
      description: 'This study compares different AI collaboration approaches to understand how people work with AI-powered systems.',
      whatYouWillDo: {
        title: 'What you will do:',
        step1: 'Complete a brief demographic questionnaire',
        step2: 'Work with two different AI-powered systems',
        step3: 'Provide feedback about your experience'
      },
      contactInfo:{
        title: 'Contact Information',
        description: 'If you have any questions, feel free to send us an email:'
      },
      duration: {
        label: 'Estimated Duration',
        time: '45-60 minutes',
        note: 'Your progress is automatically saved. You can take breaks as needed.'
      }
    },

    legalNote: {
      lable: 'Legal note'
    },
    
    privacy: {
      label: 'Privacy',
      value: 'Anonymous & GDPR-compliant',
      url: 'https://www.tu-darmstadt.de/datenschutzerklaerung.en.jsp'
    },
    
    privacyNotice: {
      title: 'Data Privacy Information',
      mainText: 'Data processing in this study is conducted in accordance with the data protection regulations of the General Data Protection Regulation (GDPR) and the Hessian Data Protection and Freedom of Information Act (HDSIG). The data will only be used for the purposes described in the information sheet. We assure you that the collected data will be stored and analyzed in completely anonymized form. It is not possible to draw conclusions about your identity.',
      researchPurpose: 'The data will be used by researchers exclusively for non-commercial research purposes and will not be shared with third parties or transferred to countries other than Germany. The evaluated research results will be published in aggregated form in a scientific publication.',
      keyPoints: {
        title: 'Key Points:',
        anonymous: 'Completely anonymized data collection and storage',
        gdprCompliant: 'GDPR and HDSIG compliant',
        voluntary: 'Voluntary participation with right to withdraw at any time',
        retention: 'Data stored for 3 years, then deleted'
      },
      viewFullPolicy: 'View full privacy policy'
    },

    privacyModal: {
      title: 'Data Privacy Information',
      content: {
        mainText: 'Data processing in this study is conducted in accordance with the data protection regulations of the General Data Protection Regulation (GDPR) and the Hessian Data Protection and Freedom of Information Act (HDSIG). The data will only be used for the purposes described in the information sheet. We assure you that the collected data will be stored and analyzed in completely anonymized form. It is not possible to draw conclusions about your identity.',
        researchPurpose: 'The data will be used by researchers exclusively for non-commercial research purposes and will not be shared with third parties or transferred to countries other than Germany. The evaluated research results will be published in aggregated form in a scientific publication.'
      },
      sections: {
        additionalInfo: {
          title: 'More Information About the Processing of Your Personal Data'
        },
        retention: {
          title: 'How Long Will Personal Data Be Processed',
          content: '3 year(s)'
        },
        categories: {
          title: 'What Special Categories of Personal Data Are Collected and Processed',
          content: 'Participants in this study are not exposed to any risk beyond the risks of everyday life.'
        },
        legalBasis: {
          title: 'Legal Basis for Processing',
          content: 'Consent of the data subject, Art. 6 Para. 1 lit. a GDPR'
        },
        recipients: {
          title: 'Recipients and Categories of Recipients of Personal Data',
          content: 'The data will be used by the Department of Information Systems | Software & AI Business at TU Darmstadt and will not be shared with third parties.'
        },
        dataTransfer: {
          title: 'Data Transfer to a Country Outside the EU/EEA or to an International Organization, and Data Transfer Subject to Appropriate Safeguards',
          content: 'The data collected in this study will be stored at TU Darmstadt and deleted after three years. Storage is done in a form that does not allow conclusions about your identity, meaning the data will be anonymized or pseudonymized. This consent form will be kept separate from other experimental materials and documents and destroyed after this period. The aim is to publish the results of the study in journals and conference contributions. The results of the study will be made publicly accessible beyond the stated deletion periods.'
        },
        confidentiality: {
          title: 'Legal or Contractual Obligation',
          content: 'All data collected in this study is of course confidential and will only be used in anonymized form. Demographic information such as age or gender does not allow clear conclusions about your identity. At no time during the study will we ask you to provide your name or other identifying information.'
        },
        rights: {
          title: 'Information on the Rights of Data Subjects',
          content: 'You have the right to obtain information about the personal data concerning you and, if applicable, to request its correction or deletion. In case of disputes, you have the right to file a complaint with the Hessian Data Protection Commissioner. Your participation in this study is voluntary. You are free to withdraw from the study at any time and thereby revoke this consent without suffering any disadvantages. If you wish to withdraw from participation, no data about you will be stored and all data about you collected so far will be destroyed.'
        },
        withdrawal: {
          title: 'Information on the Right to Revoke Consent',
          content: 'As stated in Art. 7 Para. 3 GDPR, you have the right to revoke your consent to the processing of personal data at any time. The revocation of consent does not affect the lawfulness of processing based on consent before its revocation.'
        },
        authority: {
          title: 'Data Protection Authority',
          content: 'You can file a complaint with the competent supervisory authority if you believe that we are not complying with disclosure requirements.'
        },
        dpo: {
          title: 'Our Data Protection Officer',
          content: 'Jan Hansen, Technical University of Darmstadt, Data Protection Officer'
        }
      },
      tuLink: {
        label: 'Further information',
        text: 'TU Darmstadt Privacy Policy'
      }
    },
    
    consent: {
      title: 'I consent to participate',
      text: 'I have read and understood the study information and privacy notice. I voluntarily participate in this study and know that I can withdraw at any time without providing reasons.'
    },
    
    continue: 'Continue to Study'
  },
  // ========== DEMOGRAPHICS ==========
  demographics: {
    title: 'Demographics Questionaire',

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
    requiredNote: 'Questions marked with [ASTERISK] are required',  

    basicInfo: {
      title: 'Basic Information',
      description: 'Tell us a bit about yourself',
      age: {
        label: 'Age Range',
        preferNotToSay: 'Prefer not to say'
      },
      genderIdentity: {
        label: 'Gender Identity',
        woman: 'Woman',
        man: 'Man',
        nonBinary: 'Non-binary',
        other: 'Other',
        preferNotToSay: 'Prefer not to say'
      },
      country: {
        label: 'Country/Region (optional)',
        placeholder: 'e.g., Germany, United States, Brazil, etc.'
      },
      
      firstLanguage: {
        label: 'Native Language (optional)',
        placeholder: 'e.g., German, English, Spanish, Mandarin, etc.'
      },
      education: {
        label:          'Highest level of education',
        none:           'No formal qualification',
        school:         'School leaving certificate (e.g., secondary level I)',
        upperSecondary: 'Upper secondary (e.g., A-level, high school diploma)',
        vocational:     'Vocational training / professional qualification',
        shortTertiary:  'Tertiary qualification (e.g., technical college, professional certificate)',
        bachelors:      'Bachelor’s degree or equivalent',
        masters:        'Master’s degree or equivalent ',
        phd:            'PhD or doctoral degree',
        other:          'Other qualification',
        preferNotToSay: 'Prefer not to say'
      },
      fieldOfStudy: {
        label: 'Field of Study (optional)',
        placeholder: 'e.g., Computer Science, Psychology, Engineering, etc.'
      }
    },
    professionalBackground: {
      title: 'Professional Background',
      description: 'Help us understand your professional background',
      occupation: {
        label: 'Current Occupation / Field (optional)',
        placeholder: 'e.g., Software Engineer, Student, Researcher, etc.'
      },
      industry : {
        label: 'Industry',
        tech: 'Technology',
        healthcare: 'Healthcare',
        finance: 'Finance',
        education: 'Education',
        retail: 'Retail',
        manufacturing: 'Manufacturing',
        consulting: 'Consulting',
        government: 'Goverment',
        nonprofit: 'Nonprofit',
        research: 'Research',
        student: 'Student',
        other: 'Other'
      },
      workExperience:{
        label: 'Overall professional experience',
        none: 'None',
        lessThan2: '2 years or less',
        threeToFive: '3 to 5  years',
        sixToTen: '6 to 10  years',
        moreThan10: 'more than 10  years'
      }

    },
    technicalBackground: {
      title: 'Technical Background',
      description: 'Help us understand your technical experience',
      
      technicalRole: {
        label: 'Best Describes Your Technical Role (optional)',

        developer: 'Software Developer/Engineer',
        devopsEngineer: 'DevOps Engineer',
        dataScientist: 'Data Scientist/Analyst',
        researcher: 'Academic/Industry Researcher',
        proManager: 'Product/Project Manager',
        designer: 'UX/UI Designer',
        student: 'Student',
        businessAnalyst: 'Business Analyst',
        qaEngineer: 'QA/Test Engineer',
        systemArchitect: 'System/Solution Architect',
        consultant: 'Consultant',
        entrepreneur: 'Entrepreneur/Founder',
        otherTechnical: 'Other Technical Role',
        nonTechnical: 'Non-technical Role'
      },
      
      programmingExperience: {
        label: 'Programming Experience',
        none: 'No programming experience',
        basic: '< 1 year experience',
        intermediate: '1-3 years experience',
        advanced: '3-7 years experience',
        expert: '7+ years experience'
      },
      
      aiMlExperience: {
        time:{
          label: 'Experience with Artificial Intelligence (AI) and Machine Learning (ML)',
          description: 'Everyday AI usage counts! Examples: asking ChatGPT questions, using AI writing assistants, generating images with DALL-E/Midjourney, trying voice assistants (Siri, Alexa), or using any AI-powered features in apps you use.',
          none: 'No AI/ML experience',
          basic: '< 1 year experience',
          intermediate: '1-3 years experience',
          advanced: '3-7 years experience',
          expert: '7+ years experience'
        },
        level: {
          label: 'How would you rate your expertise working with AI/ML? (optional)',
          basic: 'Beginner - some exposure/learning',
          intermediate: 'Intermediate - built some AI/ML projects',
          advanced: 'Advanced - professional AI/ML work',
          expert: 'Expert - AI/ML specialist/researcher'
        }
      },
      
      tools: {
        labelWorkflow: 'Workflow/Automation Tools Used (select all that apply)',
        labelAI: 'AI Tools Used (select all that apply)',
        other: 'Other',
        none: 'None'
      },
      
      comments: {
        label: 'Additional Comments (optional)',
        placeholder: 'Any other information you would like to share, or questions about the study...'
      }
    },
    
    optionalInfo: {
      title: 'Optional Information',      
      comments: {
        label: 'Additional Comments (optional)',
        placeholder: 'Any other information you would like to share, or questions about the study...'
      }
    }
  },
  // ========== TASK ==========
  task: {
    header: {
      taskNumber: 'Task {{number}}',
      aiAssistant: 'AI Assistant',
      workflowBuilder: 'Workflow Builder',
      headphones: 'Headphones',
      shoes: 'Shoes',
      completeTooltip: 'Mark this task as complete',
      completeButton: 'Complete Task'
    },
    
    description: {
      title: 'Task Description',
      collapse: 'Collapse',
      expand: 'Expand'
    },
    
    completion: {
      title: 'Complete Task',
      message: 'Are you sure you want to mark this task as complete? This action cannot be undone.',
      confirm: 'Yes, Complete Task',
      cancel: 'Cancel'
    }
  },
  // ========== TUTORIAL ==========
  tutorial: {
    // Joyride locale (buttons)
    locale: {
      back: '← Previous',
      close: 'Close',
      last: 'Got it! ✓',
      next: 'Next →',
      skip: 'Skip tutorial',
    },
    
    // Screen-level tutorial (Task 1 only)
    screen: {
      welcome: {
        title: '👋 Welcome to the Task Screen!',
        description: 'This screen has everything you need to complete your task. Let me show you around!',
      },
      taskDescription: {
        title: '📋 Task Description',
        description: "Here you'll find your role, goal, and what output is expected. Click the arrow to collapse/expand this section.",
      },
      datasetViewer: {
        title: '📊 Dataset Viewer',
        description: "This is your data source - customer reviews you'll analyze. You can scroll through all available reviews here.",
      },
      viewModes: {
        title: '🔄 Switch View Modes',
        description: 'Toggle between Card view (easier to read) and Table view (more compact). Choose what works best for you!',
      },
      filterReviews: {
        title: '🔍 Filter Reviews',
        description: 'Filter reviews by sentiment: All, Positive (4-5 stars), Neutral (3 stars), or Negative (1-2 stars).',
      },
      popOutViwer:{
        title: '🔲 Pop-Out Viewer',
        description: 'Click this button to open the dataset viewer in a larger modal window. Perfect for when you need to focus on the data or view it in more detail!',
      },
      resizePanels: {
        title: '↔️ Resize Panels',
        description: 'Drag this handle left or right to adjust the panel sizes. Make the data viewer larger or give more space to your work area!',
      },
    },
    
    // Workflow Builder tutorial
    workflowBuilder: {
      welcome: {
        title: '🔧 Workflow Builder',
        description: 'Build your analysis by connecting tools together. Each tool processes data and passes it to the next step!',
      },
      availableTools: {
        title: '🧰 Available Tools',
        description: 'Browse all available tools in the sidebar. Each tool has a specific function for analyzing your data.',
      },
      workflowCanvas: {
        title: '🎨 Workflow Canvas',
        description: 'Drag tools from the sidebar onto this canvas to build your workflow. Connect them to define the flow of data.',
      },
      connectTools: {
        title: '🔗 Connect Tools',
        description: "Click and drag from one tool's output to another's input to connect them. This defines the flow of data.",
      },
      configureTools: {
        title: '⚙️ Configure Tools',
        description: 'Click on a tool to configure its settings. Each tool has different options you can customize.',
      },
      executeWorkflow: {
        title: '▶️ Execute Workflow',
        description: "Once your workflow is ready, click the Execute button to run it. You'll see results in real-time!",
      },
      clearWorkflow: {
        title: '🗑️ Clear & Reset',
        description: 'Use the Clear button to remove all tools and start fresh if needed.',
      },
      autoSave: {
        title: '💾 Auto-Save',
        description: "Your workflow is automatically saved as you work, so you won't lose any progress!",
      },
    },
    
    // AI Assistant tutorial
    aiAssistant: {
      welcome: {
        title: '🤖 AI Assistant',
        description: 'Chat with the AI to analyze your data. The AI will autonomously execute tasks and use tools to help you!',
      },
      chatInterface: {
        title: '💬 Chat Interface',
        description: 'Describe what you want to analyze or ask questions about the data. Be specific for best results!',
        example: 'Example: "Find the top 3 negative themes" or "Analyze sentiment distribution"',
      },
      aiTakesAction: {
        title: '🔄 AI Takes Action',
        description: "The AI will automatically use the right tools and process data to answer your questions. You'll see what it's doing in the chat.",
      },
      reviewResults: {
        title: '🔍 Review Results',
        description: 'The AI will show you analysis results, insights, and data. You can ask follow-up questions to dig deeper!',
      },
      iterateRefine: {
        title: '🔁 Iterate & Refine',
        description: 'Keep chatting to refine your analysis. Ask for more details, different perspectives, or additional insights.',
      },
      tipsForSuccess: {
        title: '💡 Tips for Success',
        tip1: 'Be specific about what you want',
        tip2: 'Ask one question at a time',
        tip3: "Review AI's work and provide feedback",
        tip4: 'Iterate until you have what you need',
      },
    },
  },
  // ========== SURVEY ==========
  survey: {
    title: 'Post-Task Survey',
    conditionAI: 'AI Assistant Condition',
    conditionWorkflow: 'Workflow Builder Condition',
    description: 'Please answer the following questions about your experience with the task.',
    
    progress: {
      section: 'Section',
      of: 'of',
      complete: 'Complete'
    },
    
    sections: {
      agency: 'Agency & Control',
      understanding: 'Understanding & Transparency',
      trust: 'Trust & Confidence',
      effort: 'Cognitive Effort',
      experience: 'Overall Experience'
    },
    
    agency: {
      control: 'I felt in control of the task execution',
      autonomy: 'I had sufficient autonomy to make decisions',
      influence: 'I could influence how the task was performed',
      decisionMaking: 'I was actively involved in decision-making'
    },
    
    understanding: {
      systemBehavior: 'I understood how the system worked',
      taskProgress: 'I could track the progress of my task',
      results: 'The results were clearly presented',
      transparency: 'The system was transparent in its operations'
    },
    
    trust: {
      reliability: 'I trust the system to perform tasks reliably',
      accuracy: 'I believe the results are accurate',
      confidence: 'I feel confident using this system',
      predictability: 'The system behaved predictably'
    },
    
    effort: {
      mentalDemand: 'The task required high mental effort',
      complexity: 'The system was complex to use',
      learning: 'Learning to use the system was easy',
      efficiency: 'I could complete the task efficiently'
    },
    
    experience: {
      satisfaction: 'I am satisfied with my overall experience',
      enjoyment: 'I enjoyed using this system',
      frustration: 'I felt frustrated during the task',
      recommendation: 'I would recommend this system to others'
    },
    
    likert: {
      stronglyDisagree: 'Strongly Disagree',
      disagree: 'Disagree',
      neutral: 'Neutral',
      agree: 'Agree',
      stronglyAgree: 'Strongly Agree'
    },
    
    navigation: {
      previous: 'Previous',
      next: 'Next',
      submit: 'Submit Survey'
    },
    
    completion: {
      title: 'Survey Completed',
      message: 'Thank you for completing the survey!',
      continue: 'Continue to Next Task'
    }
  },
  // ========== WORKFLOW ==========
  workflow: {
    builder: {
      title: 'Research Workflow',
      addNode: 'Add Node',
      addNodes: 'Add Nodes',
      dragToAdd: 'Drag to canvas to add',
      nodeCategories: {
        input: 'input',
        processing: 'processing', 
        logic: 'logic',
        analysis: 'analysis',
        ai: 'ai',
        output: 'output'
      },
      nodes: {
        loadData: 'Load Data',
        filterData: 'Filter Data',
        cleanData: 'Clean Data',
        sortData: 'Sort Data',
        logicIf: 'Logic If',
        combineData: 'Combine Data',
        sentimentAnalysis: 'Sentiment Analysis',
        generateInsights: 'Generate Insights',
        showResults: 'Show Results'
      },
      nodeTypes: {
        dataInput: 'Data Input',
        dataProcessing: 'Data Processing',
        conditional: 'Conditional',
        analysis: 'Analysis',
        aiOperation: 'AI Operation',
        output: 'Output'
      },
      toolbar: {
        save: 'Save',
        clear: 'Clear',
        settings: 'Settings',
        execute: 'Execute'
      },
      status: {
        ready: 'Ready to execute',
        emptyWorkflow: 'Empty workflow',
        missingInput: 'Missing input node',
        missingOutput: 'Missing output node',
        noConnections: 'No connections',
        incompleteWorkflow: 'Incomplete workflow'
      },
      statusDetails: {
        addNodes: 'Add nodes to start building your workflow',
        addInput: 'Add a data input node to start your workflow',
        addOutput: 'Add an output node to complete your workflow',
        connectNodes: 'Connect your nodes to create a workflow path',
        createPath: 'Create a path from input to output nodes',
        nodesConnected: '{{count}} nodes connected properly'
      },
      emptyState: {
        title: 'Start Building Your Workflow',
        description: 'Drag and drop nodes from the sidebar to create your research automation workflow.',
        addFirstNode: 'Add Your First Node'
      },
      connectionHelper: {
        connecting: 'Drag to connect nodes • Green = Valid target • Gray = Invalid'
      },
      nodeEditor: {
        title: 'Edit Node',
        label: 'Label',
        description: 'Description',
        cancel: 'Cancel',
        save: 'Save'
      }
    },
    sidebar: {
      dashboard: 'Dashboard',
      builder: 'Workflow Builder',
      aichat: 'AI Assistant',
      templates: 'Templates',
      executions: 'Executions',
      analytics: 'Analytics',
      tutorials: 'Tutorials',
      settings: 'Settings'
    },
    notifications: {
      nodeAdded: 'Node added successfully',
      nodeDeleted: 'Node deleted',
      nodeSaved: 'Node saved',
      connectionAdded: 'Connection created',
      connectionDeleted: 'Connection removed',
      connectionFailed: 'Cannot create connection',
      validationFailed: 'Workflow validation failed',
      maxNodesReached: 'Maximum number of nodes ({{max}}) reached',
      maxEdgesReached: 'Maximum number of connections ({{max}}) reached',
      sourceHandleMaxReached: 'Source handle already has maximum of {{max}} connection{{max === 1 ? "" : "s"}}',
      targetHandleMaxReached: 'Target handle already has maximum of {{max}} connection{{max === 1 ? "" : "s"}}',
      workflowSaved: 'Workflow saved: {{nodes}} nodes, {{connections}} connections',
      workflowExecuted: 'Workflow executed with {{nodes}} nodes and {{connections}} connections',
      workflowCleared: 'Workflow cleared'
    }
  }
};