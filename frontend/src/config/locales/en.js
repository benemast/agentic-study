// frontend/src/config/locales/en.js
export const en = {
  // ========== COMMON ==========
  common: {
    form: {
      pleaseSelect: 'Please select...',
      selectOption: 'Please select...',
      required: 'This field is required',
      optional: '(optional)',
      yes: 'Yes',
      no: 'No'
    },
    
    validation: {
      required: 'This field is required',
      pleaseFillRequired: 'Please fill in all required fields before continuing',
      invalidEmail: 'Please enter a valid email address',
      minNum: 'Min: {{min}}',
      maxNum: 'Max: {{max}}',
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
  // ========== DATA VIEWER ==========
  dataViewer: {
    title: 'Data Viewer',
    reviewsCount: 'reviews',
    openModal: 'Open in modal',
    updating: 'Updating...',
    noReviews: 'No reviews found.',
    viewMode: {
      cards: 'Card view',
      table: 'Table view'
    },
    filters: {
      all: 'All',
      positive: 'Positive',
      neutral: 'Neutral',
      negative: 'Negative',
      allProducts: 'All Products'
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
        title: 'Dataset Viewer',
        description: "This is your data source - customer reviews you'll analyze. You can scroll through all available reviews here.",
      },
      viewModes: {
        title: 'Switch View Modes',
        description: 'Toggle between Card view (easier to read) and Table view (more compact). Choose what works best for you!',
      },
      filterReviews: {
        title: '🔍 Filter Reviews',
        description: 'Filter reviews by rating: All, Positive (4-5 stars), Neutral (3 stars), or Negative (1-2 stars).',
      },
      popOutViwer:{
        title: '🔲 Pop-Out Viewer',
        description: 'Click this button to open the dataset viewer in a larger window. Perfect for when you need to focus on the data or view it in more detail!',
      },
      resizePanels: {
        title: '↔️ Resize Panels',
        description: 'Drag this handle left or right to adjust the panel sizes. Make the data viewer larger or give more space to your work area!',
      },
      tutorialButtons: {
        title: '📚 Restart Tutorials',
        description: 'Should you need a refresher later on you can always restart this tutorial. The button on the left will focus on the features of this page overall, while the one on the right will give a refresher on the task specific elements!',
      }
    },
    
    // Workflow Builder tutorial
    workflowBuilder: {
      welcome: {
        title: '🔧 Workflow Builder',
        description: 'Build your analysis by connecting tools together. Each tool processes data and passes it to the next step!',
      },
      
      // NEW: Sidebar section
      sidebar: {
        title: '📚 Tool Library',
        description: 'This sidebar contains all available tools. Tools are organized into categories based on their function:',
        input: 'Load and import your data',
        processing: 'Filter, clean, and transform data',
        analysis: 'Perform analytical operations',
        output: 'Display and export results',
        finalRemark: 'Browse through different types of nodes to build your workflow.'
      },
      
      // NEW: Tooltips feature
      tooltips: {
        title: '💬 Hover for Details',
        description: 'Each tool has a helpful tooltip that appears when you hover over it. These tooltips explain what the tool does and how to use it.',
        tryText: 'Try hovering over "Load Reviews" to see its tooltip!',
      },
      
      // Canvas
      canvas: {
        title: '🎨 Workflow Canvas',
        description: 'This is your workspace where you build workflows by dragging and connecting tools.',
        actionTitle: 'How to Add Tools',
        actionText: 'Drag any tool from the sidebar and drop it onto the canvas to add it to your workflow.',
      },
      
      // NEW: Toolbar section
      toolbar: {
        title: '🔧 Workflow Toolbar',
        description: 'The toolbar at the top provides workflow controls and status:',
        statusIndicator: 'Status Indicator',
        statusDescription: 'Shows if your workflow is ready to execute (green) or needs fixes (yellow)',
        saveButton: 'Save',
        saveDescription: 'Manually save your workflow (also auto-saves)',
        clearButton: 'Clear',
        clearDescription: 'Remove all nodes and start fresh',
        executeButton: 'Execute',
        executeDescription: 'Run your workflow (only enabled when workflow is valid)',
      },
      
      // NEW: Node settings
      nodeSettings: {
        title: '⚙️ Configure Your Tools',
        description: 'Each tool can be configured with specific settings. These settings appear directly on the node.',
        displayTitle: 'Settings Display',
        displayText: 'Configured settings are shown in a blue box on each node so you can see your choices at a glance.',
        editTitle: 'Edit Settings',
        editText: 'Click the blue pencil icon on any node to open its configuration dialog.',
      },
      
      // Connections
      connections: {
        title: '🔗 Connect Your Tools',
        description: 'Connect tools to define the flow of data through your workflow:',
        topHandle: 'Top handle (▲) receives input from previous tools',
        bottomHandle: 'Bottom handle (▼) sends output to next tools',
        dragConnect: 'Click and drag from one handle to another to create a connection',
        validTitle: 'Valid Connections',
        validText: 'Green highlights show valid connection targets. Invalid targets won\'t highlight.',
      },
      
      // NEW: Visual feedback
      visualFeedback: {
        title: '🎨 Visual Connection Indicators',
        description: 'Handle colors show connection status:',
        greenValid: 'Green - Valid connection target (when connecting)',
        grayUnconnected: 'Gray - Not connected',
        blueConnected: 'Blue - Already connected',
      },
      
      // Execute
      execute: {
        title: '▶️ Execute Your Workflow',
        description: 'Once your workflow is complete, click Execute to run it and see results.',
        requirementsTitle: 'Requirements',
        requirementsText: 'Your workflow needs at least one input node, one output node, and a valid path connecting them.',
      },
      
      // Tips
      tips: {
        title: '💡 Tips for Success',
        startSimple: 'Start simple: Load Reviews → Show Results is a valid workflow!',
        useTooltips: 'Use tooltips: Hover over tools to learn what they do',
        checkSettings: 'Configure settings: Each tool shows its settings on the node',
        validateBefore: 'Check the status: Make sure the toolbar shows "Ready" before executing',
        autoSave: 'Auto-saved: Your progress saves automatically as you work',
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
        title: 'AI Takes Action',
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
        loadReviews: {
          label: 'Load Reviews',
          type: 'Data Input',
          description: 'Load product reviews from the database. This is your starting point - select reviews by category, rating, or verified purchase status.',
          config: {
            category: {
              label: 'Product Category',
              help: 'Select which product category to load reviews from',
              placeholder: 'Select category',
              options: {
                shoes: 'Shoes',
                wireless: 'Wireless Headphones'
              }
            },
            limit: {
              label: 'Maximum Reviews',
              help: 'Limit the number of reviews to load (leave empty for all)',
              placeholder: 'No limit'
            }
          }
        },
        
        filterReviews: {
          label: 'Filter Reviews',
          type: 'Data Processing',
          description: 'Filter reviews based on specific criteria like rating range, verified purchases, or keywords. Narrows down your dataset to relevant entries.',
          config: {
            field: {
              label: 'Filter Column',
              help: 'Select which column to filter by',
              placeholder: 'Select column'
            },
            operator: {
              label: 'Filter Condition',
              help: 'Select how to compare the values',
              placeholder: 'Select condition'
            },
            value: {
              label: 'Filter Value',
              help: 'Enter the value to filter by',
              placeholder: 'Enter value'
            }
          }
        },
        
        sortReviews: {
          label: 'Sort Reviews',
          type: 'Data Processing',
          description: 'Arrange reviews in a specific order by rating, helpfulness, engagement, or other fields. Helps organize data for better analysis.',
          config: {
            sortBy: {
              label: 'Sort By Column',
              help: 'Select which column to sort by',
              placeholder: 'Select column'
            },
            descending: {
              label: 'Sort Direction',
              help: 'Choose sort direction',
              options: {
                true: 'Descending (High to Low)',
                false: 'Ascending (Low to High)'
              }
            }
          }
        },
        
        cleanData: {
          label: 'Clean Reviews',
          type: 'Data Processing',
          description: 'Automatically detect and remove spam, duplicates or reviews missing data. Improves data quality before analysis.',
          config: {
            removeNulls: {
              label: 'Remove Null Values',
              help: 'Remove records with null/empty values in key fields',
              placeholder: 'Enable to remove nulls'
            },
            normalizeText: {
              label: 'Normalize Text',
              help: 'Standardize text formatting and remove special characters',
              placeholder: 'Enable to normalize text'
            },
            removeDuplicates: {
              label: 'Remove Duplicates',
              help: 'Remove duplicate reviews based on review ID',
              placeholder: 'Enable to remove duplicates'
            }
          }
        },
        
        // Analysis Tools
        reviewSentimentAnalysis: {
          label: 'Sentiment Analysis',
          type: 'AI Powered Analysis',
          description: 'Extract key themes and sentiment patterns from customer reviews. Identifies what customers discuss most and how they feel about specific product aspects.',
          config: {
            extractThemes: {
              label: 'Extract Key Themes',
              help: 'Identify recurring topics customers discuss (e.g., comfort, durability, price)',
              placeholder: 'Enable theme extraction'
            },
            themeSeparation: {
              label: 'Theme Organization',
              help: 'How should themes be categorized?',
              options: {
                combined: 'All Themes Together',
                bySentiment: 'Separate Positive/Negative Themes'
              }
            },
            maxThemesPerCategory: {
              label: 'Number of Themes',
              help: 'How many themes to extract per category'
            },
            includePercentages: {
              label: 'Include Theme Percentages',
              help: 'Calculate frequency percentage for each theme',
              placeholder: 'Enable to show percentages'
            }
          }
        },
        
        generateInsights: {
          label: 'Generate Insights',
          type: 'AI Powered Analysis',
          description: 'Generate actionable business recommendations based on customer feedback analysis. Translates patterns into strategic next steps.',
          config: {
            focusArea: {
              label: 'Recommendation Focus',
              help: 'What type of recommendations to prioritize',
              options: {
                competitivePositioning: {
                  label: 'Competitive Positioning',
                  help: 'Compare your product against competitors and identify market opportunities'
                },
                customerExperience: {
                  label: 'Customer Experience',
                  help: 'Improve customer satisfaction and address pain points'
                },
                marketingMessages: {
                  label: 'Marketing Messages',
                  help: 'Craft effective messaging based on customer language and priorities'
                },
                productImprovements: {
                  label: 'Product Improvements',
                  help: 'Identify specific features or quality improvements customers want'
                }
              }
            },
            maxRecommendations: {
              label: 'Number of Recommendations',
              help: 'Maximum number of recommendations to generate'
            }
          }
        },
        
        // Output Tool
        showResults: {
          label: 'Show Results',
          type: 'Output',
          description: 'Display the final output of your workflow. This is your endpoint - it presents the processed data, analysis results, and insights.',
          note: 'Only data available from previous tools will be displayed. Unavailable sections will be marked.',
          config: {
            includeSections: {
              label: 'Report Sections',
              help: 'Select sections to include in your report',
              options: {
                executiveSummary: {
                  label: 'Executive Summary',
                  help: 'High-level overview of findings and key takeaways'
                },
                themes: {
                  label: 'Key Themes',
                  help: 'Extracted themes with frequencies and sentiment analysis'
                },
                recommendations: {
                  label: 'Recommendations',
                  help: 'Actionable business recommendations based on analysis'
                },
                statistics: {
                  label: 'Statistics & Metrics',
                  help: 'Quantitative data and distribution metrics'
                },
                dataPreview: {
                  label: 'Data Preview',
                  help: 'Sample of raw review data used in analysis'
                }
              }
            },
            statisticsMetrics: {
              label: 'Statistics to Display',
              help: 'Select which statistics to include (only shown if Statistics section is enabled)',
              options: {
                sentimentDistribution: {
                  label: 'Overall Sentiment Distribution',
                  help: 'Percentage breakdown of positive, neutral, and negative reviews'
                },
                reviewSummary: {
                  label: 'Total Reviews & Average Rating',
                  help: 'Total number of reviews analyzed and mean rating'
                },
                ratingDistribution: {
                  label: 'Rating Distribution',
                  help: 'Count and percentage of reviews by rating (1-5 stars)'
                },
                verifiedRate: {
                  label: 'Verified Purchase Rate',
                  help: 'Percentage of reviews from verified purchases vs. unverified'
                },
                themeCoverage: {
                  label: 'Theme Coverage',
                  help: 'Percentage of reviews that mention identified themes'
                },
                sentimentConsistency: {
                  label: 'Sentiment Consistency',
                  help: 'Correlation between star ratings and sentiment classification'
                }
              }
            },
            showVisualizations: {
              label: 'Include Visualizations',
              help: 'Display charts and graphs where applicable',
              placeholder: 'Enable to show charts'
            },
            maxDataItems: {
              label: 'Maximum Items in Data Preview',
              help: 'Limit number of items shown in data preview table'
            }
          }
        },
        
        // Logic Tools
        logicIf: {
          label: 'Logic If',
          type: 'Conditional',
          description: 'Split the workflow based on a condition. Routes data to different paths depending on whether the condition is true or false.'
        },

        combineData: {
          label: 'Combine Data',
          type: 'Data Processing',
          description: 'Merge data from multiple workflow branches. Brings together results from different processing paths.'
        },
        settings: {
          // General 
          // workflow.nodes.settings.notConfigured
          notConfigured: 'Not configured',
          locked: 'Some settings are locked for this task and cannot be changed. These are pre-configured to ensure the task works correctly.',
          
          // Sentiment Analysis Node
          sentiment: {
            extractThemes: 'Extract themes',
            separatedBySentiment: 'Separated by sentiment',
            maxThemes: '{{count}} theme(s)',
            withPercentages: 'With percentages'
          },
          
          // Generate Insights Node
          insights: {
            competitive_positioning: 'Competitive Positioning',
            customer_experience: 'Customer Experience',
            marketing_messages: 'Marketing Messages',
            product_improvements: 'Product Improvements',
            withMax: '{{areas}} (max {{max}})'
          },
          
          // Show Results Node
          results: {
            sections: {
              executive_summary: 'Summary',
              themes: 'Themes',
              recommendations: 'Recommendations',
              statistics: 'Statistics',
              data_preview: 'Data'
            },
            withStats: '{{count}} stat(s)',
            withCharts: 'With charts',
            maxItems: 'Max {{max}} items'
          },
          
          // Filter node (existing, keep as-is)
          filter: 'Filter by {{column}} {{operator}} {{value}}',
          
          // Sort node (existing, keep as-is)
          sort: 'Sort by {{column}} ({{direction}})',
          ascending: {
            full: 'ascending',
            short: '↑ Asc'
          },
          descending: {
            full: 'descending',
            short: '↓ Desc'
          },
          
          // Clean node (existing, keep as-is)
          clean: {
            label: 'Clean: {{actions}}',
            removeNulls: 'remove nulls',
            removeDuplicates: 'remove duplicates',
            normalizeText: 'normalize text'
          },
          
          // Load node (existing, keep as-is)
          load: {
            wireless: 'Wireless',
            shoes: 'Shoes',
            withLimit: 'Load {{category}} (max {{limit}})',
            noLimit: 'Load {{category}}'
          },
          
          // Operators (used by filter and logic nodes)
          operators: {
            signs: {
              equals: '=',
              not_equals: '≠',
              greater: '>',
              greater_or_equal: '≥',
              less: '<',
              less_or_equal: '≤'
            },
            text: {
              equals: 'Equals',
              not_equals: 'Not Equal',
              contains: 'Contains',
              not_contains: 'Not Contains',
              starts_with: 'Starts With',
              ends_with: 'Ends With',
              greater: 'Greater Than',
              greater_or_equal: 'Greater or Equal',
              less: 'Less Than',
              less_or_equal: 'Less or Equal',
              is: 'Is'
            }
          }
        }
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
        incompleteWorkflow: 'Incomplete workflow',
        configurationIncomplete: 'Configuration incomplete'
      },
      statusDetails: {
        addNodes: 'Add nodes to start building your workflow',
        addInput: 'Add a data input node to start your workflow',
        addOutput: 'Add an output node to complete your workflow',
        connectNodes: 'Connect your nodes to create a workflow path',
        createPath: 'Create a path from input to output nodes',
        nodesConnected: '{{count}} nodes connected properly',
        configureNodes: 'Configure all required fields in nodes'
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
        save: 'Save',
        options: 'Options',
        fields: 'fields',
        noConfig: 'No configuration options available',
        fixErrors: 'Please fix {{count}} error(s)'
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
      workflowCleared: 'Workflow cleared',
      executionFailed: 'Workflow execution failed',
      executionStarted: 'Workflow execution started',
      executionCompleted: 'Workflow execution completed',
      executionCancelled: 'Workflow execution cancelled',
      validationFailed: 'Workflow validation failed',
      
      // More detailed versions (optional)
      executionFailedWithError: 'Workflow execution failed: {{error}}',
      validationFailedWithErrors: 'Workflow validation failed: {{errors}}'
    }
  }
};