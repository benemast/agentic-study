// frontend/src/config/locales/en.js
export const en = {
  // ========== COMMON ==========
  common: {
    form: {
      pleaseSelect: 'Please select…',
      selectOption: 'Please select…',
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
      init: 'Initializing study…'
    }
  },
  // ========== FOOTER ==========
  footer: {
    legalNote: {
      label: 'Legal Note',
      url: 'https://www.tu-darmstadt.de/impressum/index.en.jsp'
    },
    note:'The study takes approximately 30 minutes. Your progress is automatically saved.',
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
        time: '30 minutes',
        note: 'Your progress is automatically saved. You can take breaks as needed.'
      }
    },

    legalNote: {
      lable: 'Legal Note'
    },
    
    privacy: {
      label: 'Privacy',
      value: 'Anonymous & GDPR-Compliant',
      url: 'https://www.tu-darmstadt.de/datenschutzerklaerung.en.jsp'
    },
    
    privacyNotice: {
      title: 'Data Privacy Information',
      mainText: 'Data processing in this study is conducted in accordance with the data protection regulations of the General Data Protection Regulation (GDPR) and the Hessian Data Protection and Freedom of Information Act (HDSIG). The data will only be used for the purposes described in the information sheet. We assure you that the collected data will be stored and analyzed in completely anonymized form. It is not possible to draw conclusions about your identity.',
      researchPurpose: 'The data will be used by researchers exclusively for non-commercial research purposes and will not be shared with third parties or transferred to countries other than Germany. The evaluated research results will be published in aggregated form in a scientific publication.',
      keyPoints: {
        title: 'Key Points:',
        anonymous: 'Completely anonymized data collection and storage',
        gdprCompliant: 'GDPR and HDSIG Compliant',
        voluntary: 'Voluntary participation with right to withdraw at any time',
        retention: 'Data stored for 3 years, then deleted'
      },
      viewFullPolicy: 'View Full Privacy Policy'
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
        label: 'Further Information',
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
        preferNotToSay: 'Prefer Not to Say'
      },
      genderIdentity: {
        label: 'Gender Identity',
        woman: 'Woman',
        man: 'Man',
        nonBinary: 'Non-Binary',
        other: 'Other',
        preferNotToSay: 'Prefer Not to Say'
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
        label:          'Highest Level of Education',
        none:           'No Formal Qualification',
        school:         'School leaving certificate (e.g., secondary level I)',
        upperSecondary: 'Upper secondary (e.g., A-level, high school diploma)',
        vocational:     'Vocational training / professional qualification',
        shortTertiary:  'Tertiary qualification (e.g., technical college, professional certificate)',
        bachelors:      'Bachelor’s Degree or Equivalent',
        masters:        'Master’s Degree or Equivalent ',
        phd:            'Phd or Doctoral Degree',
        other:          'Other Qualification',
        preferNotToSay: 'Prefer Not to Say'
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
        label: 'Overall Professional Experience',
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
        none: 'No Programming Experience',
        basic: '< 1 Year Experience',
        intermediate: '1-3 Years Experience',
        advanced: '3-7 Years Experience',
        expert: '7+ Years Experience'
      },
      
      aiMlExperience: {
        time:{
          label: 'Experience with Artificial Intelligence (AI) and Machine Learning (ML)',
          description: 'Everyday AI usage counts! Examples: asking ChatGPT questions, using AI writing assistants, generating images with DALL-E/Midjourney, trying voice assistants (Siri, Alexa), or using any AI-powered features in apps you use.',
          none: 'No AI/ML Experience',
          basic: '< 1 Year Experience',
          intermediate: '1-3 Years Experience',
          advanced: '3-7 Years Experience',
          expert: '7+ Years Experience'
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
        placeholder: 'Any other information you would like to share, or questions about the study…'
      }
    },
    
    optionalInfo: {
      title: 'Optional Information',      
      comments: {
        label: 'Additional Comments (optional)',
        placeholder: 'Any other information you would like to share, or questions about the study…'
      }
    }
  },
  // ========== BRIEFING ==========
  briefing:{
    title: "Welcome, Analyst!",
    mainContent: {
      intro: {
        first: "In this study, you'll step into the role of a ",
        strong: "Product Analyst at Amerzone",
        final: ", a leading e-commerce platform known for connecting millions of customers with everything from stylish footwear to the latest tech gear."
      },
      toolBox: {
        first: "Amerzone's Product Insights team is currently testing ",
        strong: "two new tools",
        final: " designed to help analysts transform customer feedback into clear, actionable insights:",
        workflow: {
          strong: "The Workflow Builder",
          text: ", where you can structure and control your own analysis process."
        },
        assistant: {
          strong: "The AI Chat Assistant",
          text: ", a conversational partner that guides and supports you."
        }
      },
      mission: {
        first: "Your mission is to analyze real customer reviews for ",
        strong: "two products",
        final: " — one in the wireless headphones category and one in the shoes category — and to prepare a short insights briefing for each."
      },
      counterBalance: "The order in which you'll work with the tools and products will vary, but by the end, you'll have experienced both systems and both tasks.",
      colaboration: {
        first: "Amerzone is especially interested in how analysts collaborate with AI tools that show ",
        strong: "different levels of autonomy",
        final: " — from those that follow your lead step-by-step, to those that act more like proactive teammates.",
        feedback: "Your feedback and interaction will help decide how to design the companys next-generation product analysis platform."
      },
      tutorial: {
        first: "Before diving into your assignments, you'll first go through a short ",
        strong: "tutorial",
        final: " that introduces the platform and walks you through its main features. Once you're familiar with the interface, you'll move on to the first analysis task."
      },
    },
    close: "So, settle in, open your analyst dashboard, and get ready to help Amerzone turn customer voices into strategy.",
    ready: "Ready to Begin"
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
      completeButton: 'Complete Task',
      viewSummaryFirst: 'Please execute and view the summary before completing the task',
      executeFirst: 'Please execute the workflow/chat to generate results'
    },
    
    description: {
      title: 'Task Description',
      collapse: 'Collapse',
      expand: 'Expand',
      role: 'Your Role: Product Analyst',
      goal: 'Prepare an insights briefing on customer feedback',
      focusLabel: 'Focus: ',
      focusText: {
        wireless: "Amerzone’s Electronics Merchandising Team is reviewing next quarter’s vendor lineup and wants to decide whether to continue offering the Mpow Cheetah headphones. They’re relying on your analysis to understand what customers appreciate most, what issues are common, and whether this product still deserves its spot in Amerzone’s wireless catalog.",
        shoes: 'Amerzone’s Seasonal Campaign Team is planning a new rainwear feature and wants to showcase authentic customer experiences. They’re counting on your analysis of the Kamik Jennifer Rain Boot reviews to highlight what customers love most, what concerns they mention, and which themes might inspire the campaign’s messaging and visuals.',
      },
      expectedOutputLabel: 'What your analysis should include:',
      expectedOutput1: 'Executive Summary of Customer Sentiment',
      expectedOutput2: 'Top Positive Themes (with Distribution Metrics)',
      expectedOutput3: 'Top Negative Themes (with Distribution Metrics)',
      expectedOutput4: 'Actionable Recommendations',
      productCard:{
        title: 'Product to analyse:',
        titleLable: 'Title:',
        categoryLabel: 'Category:',
        wireless: 'Wireless / Headphones',
        shoes: 'Shoes'
      }
    },
    previousSummary: {
      title: "Summary Available",
      savedOn: "Saved on",
      at: "at",
      unknownTime: "Unknown time",
      viewButton: "View Summary"
    },
    completion: {
      title: 'Complete Task',
      message: 'Are you satisfied that the results meet the task requirements?',
      confirm: 'Yes, Complete Task',
      cancel: 'Cancel'
    }
  },
  // ========== DATA VIEWER ==========
  dataViewer: {
    title: 'Data Viewer',
    reviewsCount: 'reviews',
    openModal: 'Open in modal',
    updating: 'Updating…',
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
        description: 'This screen has everything you need to complete your task. Let me show you around.',
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
        title: '📑 Switch View Modes',
        description: 'Toggle between Card view (easier to read) and Table view (more compact). Choose what works best for you.',
      },
      filterReviews: {
        title: '🔍 Filter Reviews',
        description: 'Filter reviews by rating: All, Positive (4-5 stars), Neutral (3 stars), or Negative (1-2 stars).',
      },
      popOutViwer:{
        title: '🔲 Pop-Out Viewer',
        description: 'Click this button to open the dataset viewer in a larger window. Perfect for when you need to focus on the data or view it in more detail.',
        devNote: 'Developer Note:',
        devNoteText: 'If the Data Viewer looks smaller than expected, it’s just a display glitch that can happen on some browsers or screen sizes. Simply toggle between Card and Table view once to fix it.'
      },
      resizePanels: {
        title: '↔️ Resize Panels',
        description: 'Drag this handle left or right to adjust the panel sizes. Make the data viewer larger or give more space to your work area.',
      },
      tutorialButtons: {
        title: '📚 Restart Tutorials',
        description: 'Should you need a refresher later on you can always restart this tutorial. The button on the left will focus on the features of this page overall, while the one on the right will give a refresher on the task specific elements.',
      },
      completeTaskButton: {
        title: '✔️ Complete Task',
        description: 'After you viewed your latest results you will be able to complete the task, if you are happy with the contents.',
      },
      final:{
        title: "🎉 Phew, made it to the end!",
        description: "That was a lot to take in, but you’re all set now. Thanks for sticking with it! 🙌"
      }
    },
    
    // Workflow Builder tutorial
    workflowBuilder: {
      welcome: {
        title: '🔧 Workflow Builder',
        description: 'Build your analysis by connecting tools together. Each tool processes data and passes it to the next step.',
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
        tryText: 'Try hovering over "Load Reviews" to see its tooltip.',
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
        whatHappensTitle: "What’s Next",
        whatHappensBody: "Each node’s executin status is shown by an icon on its left: ✅ Success, 🔄 Processing, or ❌ Failure. Click an icon to view more details.",
        viewResultsTitle: "View Your Results",
        viewResultsText: "Click the success icon on your 'Show Results' node to see the review summary generated by your workflow. This will unlock the task for completion — you decide when you’re satisfied with the results.",
      },
      
      // Tips
      tips: {
        title: '💡 Tips for Success',
        startSimple: 'Start simple: Load Reviews → Show Results is a valid workflow.',
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
        description: 'Chat with the Assistant to analyze your data. The Assistant will autonomously execute tasks and use tools to help you.',
      },
      chatInterface: {
        title: '💬 Chat Interface',
        description: 'Describe the task you ',
        example: 'Example: "Analyze sentiment distribution for Product ID XYZ"',
        devNote: "Developer Note:",
        devNoteText: "The base dataset is pretty large, so the Assistant only has a very limited understanding of the specific data you’re using."
      },
      aiTakesAction: {
        title: '🤖 Assistant Takes Action',
        description: "The Assistant will automatically use the right tools and process data to answer your questions. You'll see what it's doing in the chat.",
      },
      reviewResults: {
        title: '🔍 Review Results',
        description: 'The Assistant will show you analysis results, insights, and data.',
      },
      iterateRefine: {
        title: '🔁 Iterate & Refine',
        description: 'Keep chatting to refine your analysis until you are satisfied with the results.',
      },
      clearChat: {
        title: '🗑️ Clear Chat',
        description: 'If the Assistant ever seems off-track or not doing what you expect, just clear the chat and start fresh.',
      },
      tipsForSuccess: {
        title: '💡 Tips for Success',
        tip1: 'Be specific about what you want',
        tip2: 'Ask one question at a time',
        tip3: "Review Assistant's work",
        tip4: 'Iterate until you have what you need',
      },
    },
  },
  // ========== SURVEY ==========
  survey: {
    // Main survey labels
    title: 'Post-Task Survey {{number}}',
    description: 'Please rate your experience with {{condition}}',
    conditionWorkflow: 'the Workflow Builder',
    conditionAI: 'the AI Assistant',
    submit: 'Submit Survey',
    submitting: 'Submitting survey…',
    allQuestionsRequired: 'Please answer all questions before proceeding.',

    // Progress indicators
    progress: {
      section: 'Section',
      question: 'Question',
      of: 'of',
      complete: 'complete'
    },

    // Section titles and descriptions
    sections: {
      cognitiveWorkload: 'Cognitive Workload Assessment',
      cognitiveWorkloadDesc: 'Please rate the mental effort required to complete the task.',
      controlEngagement: 'Control, Agency & Engagement',
      controlEngagementDesc: 'Please rate your experience with control and engagement.',
      understanding: 'Understanding & Explainability',
      understandingDesc: 'Please rate how well you understood what the system was doing.',
      performance: 'Task Performance & Outcomes',
      performanceDesc: 'Please rate how well the system supported your work.',
      feedback: 'Additional Feedback',
      feedbackDesc: 'Please share any additional thoughts (optional).'
    },

    // NASA-TLX (5 dimensions)
    nasaTlx: {
      // Dimension 1: Mental Demand
      mentalDemand: 'Mental Demand',
      mentalDemandDesc: 'How mentally demanding was the task?',

      // Dimension 2: Temporal Demand
      temporalDemand: 'Temporal Demand',
      temporalDemandDesc: 'How hurried or rushed was the pace of the task?',

      // Dimension 3: Performance
      performance: 'Performance',
      performanceDesc: 'How successful were you in accomplishing what you were asked to do?',

      // Dimension 4: Effort
      effort: 'Effort',
      effortDesc: 'How hard did you have to work to accomplish your level of performance?',

      // Dimension 5: Frustration
      frustration: 'Frustration',
      frustrationDesc: 'How insecure, discouraged, irritated, stressed, and annoyed were you?',

      // Scale labels
      veryLow: 'Very Low',
      veryHigh: 'Very High',
      perfect: 'Perfect',
      failure: 'Failure',

      // Instructions and helpers
      instruction: 'Please rate each dimension by moving the slider. You can drag the slider or click anywhere on the scale.',
      pleaseRate: 'Please rate',
      dragOrClick: 'Drag the slider or click to set your rating'
    },

    // 7-Point Likert Scale
    likert7: {
      // Full labels
      stronglyDisagree: 'Strongly Disagree',
      disagree: 'Disagree',
      somewhatDisagree: 'Somewhat Disagree',
      neutral: 'Neutral',
      somewhatAgree: 'Somewhat Agree',
      agree: 'Agree',
      stronglyAgree: 'Strongly Agree',

      // Short labels (for buttons with line breaks)
      short: {
        stronglyDisagree: 'Strongly\nDisagree',
        disagree: 'Disagree',
        somewhatDisagree: 'Somewhat\nDisagree',
        neutral: 'Neutral',
        somewhatAgree: 'Somewhat\nAgree',
        agree: 'Agree',
        stronglyAgree: 'Strongly\nAgree'
      }
    },

    // Section 2: Control, Agency & Engagement (6 questions)
    section2: {
      controlTask: 'I felt in control of the task throughout the process.',
      agencyDecisions: 'I was able to make meaningful decisions about how to approach the task.',
      engagement: 'I remained focused and engaged while working with the system.',
      confidenceQuality: 'I feel confident in the quality of the analysis I produced.',
      trustResults: 'I trust the results produced by the system.',
      satisfaction: 'Overall, I am satisfied with my experience using this system.'
    },

    // Section 3: Understanding & Explainability (6 questions)
    section3: {
      processTransparency: 'I understood what the system was doing at each step.',
      predictability: 'The system\'s behavior was predictable and consistent.',
      understoodChoices: 'I understood why the system made specific choices.',
      understoodReasoning: 'I understood the reasoning behind the system\'s suggestions.',
      couldPredict: 'I could predict what the system would do next.',
      couldExplain: 'I could explain how the system arrived at its conclusions.'
    },

    // Section 4: Task Performance & Outcomes (8 questions)
    section4: {
      easeOfUse: 'The system was easy to use.',
      efficiency: 'The system helped me complete the task efficiently.',
      reasonableTime: 'I was able to accomplish the task in a reasonable amount of time.',
      foundInsights: 'The system helped me find the insights I was looking for.',
      exploredThoroughly: 'The system helped me explore the data thoroughly.',
      discoveredInsights: 'I discovered insights I wouldn\'t have found manually.',
      accurateReliable: 'The results produced were accurate and reliable.',
      recommend: 'I would recommend this system to others for similar tasks.'
    },

    // Open-Ended Feedback
    openEnded: {
      optional: 'These questions are optional but your feedback is valuable.',
      positive: 'What did you like most about the system?',
      negative: 'What frustrated you or could be improved?',
      improvements: 'Any suggestions for improvements?',
      placeholder: 'Share your thoughts here…'
    }
  },
  // ========== WORKFLOW ==========
  workflow: {
    validation: {
      // Status Titles
      emptyWorkflow: 'Empty workflow',
      missingInput: 'Missing input node',
      missingOutput: 'Missing output node',
      noConnections: 'No connections',
      incompletePath: 'Incomplete workflow',
      configurationIncomplete: 'Configuration incomplete',
      floatingNodesDetected: 'Floating nodes detected',
      readyToExecute: 'Ready to execute',
      
      // Status Details
      statusDetails: {
        addNodes: 'Add nodes to start building your workflow',
        addInput: 'Add a data input node to start your workflow',
        addOutput: 'Add an output node to complete your workflow',
        connectNodes: 'Connect your nodes to create a workflow path',
        createPath: 'Create a path from input to output nodes',
        nodesConnected: '{{count}} nodes connected properly',
        configureNodes: 'Configure all required fields in nodes'
      },
      
      // Configuration Errors
      configErrors: {
        fieldRequired: '"{{field}}" is required',
        multiselectRequired: '"{{field}}" must have at least one selection',
        singleNode: '"{{node}}" needs configuration',
        multipleNodes: '{{count}} nodes need configuration'
      },
      
      // Floating Nodes
      floatingNodes: {
        singleNode: '1 node not connected: {{nodes}}',
        multipleNodes: '{{count}} nodes not connected: {{nodes}}'
      }
    },
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
              placeholder: 'Select Category',
              options: {
                shoes: 'Shoes',
                wireless: 'Wireless Headphones'
              }
            },
            limit: {
              label: 'Maximum Reviews',
              help: 'Limit the number of reviews to load (leave empty for all)',
              placeholder: 'No Limit'
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
              placeholder: 'Select Column'
            },
            operator: {
              label: 'Filter Condition',
              help: 'Select how to compare the values',
              placeholder: 'Select Condition'
            },
            value: {
              label: 'Filter Value',
              help: 'Enter the value to filter by',
              placeholder: 'Enter Value'
            }
          }
        },
        
        sortReviews: {
          label: 'Sort Reviews',
          type: 'Data Processing',
          description: 'Arrange reviews in a specific order by rating, helpfulness, engagement, or other fields. Helps organize data for better analysis.',
          config: {
            sortBy: {
              label: 'Sort by Column',
              help: 'Select which column to sort by',
              placeholder: 'Select Column'
            },
            descending: {
              label: 'Sort Direction',
              help: 'Choose Sort Direction',
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
              placeholder: 'Enable to Remove Nulls'
            },
            normalizeText: {
              label: 'Normalize Text',
              help: 'Standardize text formatting and remove special characters',
              placeholder: 'Enable to Normalize Text'
            },
            removeDuplicates: {
              label: 'Remove Duplicates',
              help: 'Remove duplicate reviews based on review ID',
              placeholder: 'Enable to Remove Duplicates'
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
              placeholder: 'Enable Theme Extraction'
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
              help: 'Calculate sentiment ditribution and frequency percentage for each theme',
              placeholder: 'Enable to Show Percentages'
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
              help: 'Maximum number of recommendations to generate per type'
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
              placeholder: 'Enable to Show Charts'
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
          notConfigured: 'Not Configured',
          locked: 'Some settings are locked for this task and cannot be changed. These are pre-configured to ensure the task works correctly.',
          
          // Sentiment Analysis Node
          sentiment: {
            extractThemes: 'Extract Themes',
            separatedBySentiment: 'Separated by Sentiment',
            maxThemes: '{{count}} theme(s)',
            withPercentages: 'With Percentages'
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
            removeNulls: 'Remove Nulls',
            removeDuplicates: 'Remove Duplicates',
            normalizeText: 'Normalize Text'
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
      sidebar: {
        used: "used",
        maxAllowed: "Limited: {{current}}/{{max}} used",
        maxReached: "Limit reached ({{max}} max)"
      },
      status: {
        ready: 'Ready to Execute',
        emptyWorkflow: 'Empty Workflow',
        missingInput: 'Missing Input Node',
        missingOutput: 'Missing Output Node',
        noConnections: 'No Connections',
        incompleteWorkflow: 'Incomplete Workflow',
        configurationIncomplete: 'Configuration Incomplete',
        running:"Running…",
        completed:"Execution successful",
        error:"Execution failed",
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
        noConfig: 'No Configuration Options Available',
        lockedFieldsNotice: 'Some settings are locked for this task and cannot be changed. These are pre-configured to ensure the task works correctly.',
        fixErrors: 'Please Fix {{count}} error(s)',
        dependencyMissing: 'Requires prior node: {{nodes}}',
        dependencyRecommended: 'Recommended prior node: {{nodes}}'
      },
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
      nodeAdded: 'Node Added Successfully',
      nodeDeleted: 'Node Deleted',
      nodeSaved: 'Node Saved',
      connectionAdded: 'Connection Created',
      connectionDeleted: 'Connection Removed',
      connectionFailed: 'Cannot Create Connection',
      validationFailed: 'Workflow Validation Failed',
      maxNodesReached: 'Maximum number of nodes ({{max}}) reached',
      maxEdgesReached: 'Maximum number of connections ({{max}}) reached',
      sourceHandleMaxReached: 'Source handle already has maximum of {{max}} connection{{max === 1 ? "" : "s"}}',
      targetHandleMaxReached: 'Target handle already has maximum of {{max}} connection{{max === 1 ? "" : "s"}}',
      workflowSaved: 'Workflow saved: {{nodes}} nodes, {{connections}} connections',
      workflowExecuted: 'Workflow executed with {{nodes}} nodes and {{connections}} connections',
      workflowCleared: 'Workflow Cleared',
      executionFailed: 'Workflow Execution Failed',
      executionStarted: 'Workflow Execution Started',
      executionCompleted: 'Workflow Execution Completed',
      executionCancelled: 'Workflow Execution Cancelled',
      validationFailed: 'Workflow Validation Failed',
      maxAllowedReached: "Cannot add '{{name}}': Maximum of {{max}} allowed",
      floatingNodesFiltered: '{{Count}} floating node(s) were automatically removed from execution',      
      executionFailedWithError: 'Workflow execution failed: {{error}}',
      validationFailedWithErrors: 'Workflow validation failed: {{errors}}',
      summaryReadyTitle: "Results Ready!",
      summaryReadyDetails: "Click the checkmark on the Show Results node to view your analysis"
    },
  },
  // ========== CHAT ==========
  chat: {
    aiAssistant: "AI Assistant",
    clearChat: "Clear Chat",
    processing:"Processing…",
    send:"Send",
    poweredBy:"Powered by AI Assistant with autonomous task execution",
    summaryAvailable: {
      title: "Analysis Summary Available",
      description: "Click to view detailed results with insights, themes, recommendations, and statistics."
    },
    working: "Assistant is working…",
    placeholder:"Let me know how I can help… (Shift+Enter for new line)",
    disconnected: "Waiting for connection…",
    clearConfirm: "Are you sure you want to clear all messages from this chat?"
  },
  // ========== COMPLETION ==========
  completion: {
    title: 'Study Completed!',
    subtitle: 'Thank you for your participation',
    thankYou: 'Your contribution to this research is greatly appreciated. All your responses have been securely saved and will help us better understand how people interact with AI systems.',
    
    summary: {
      title: 'What You Completed',
      
      demographics: 'Demographics Questionnaire',
      demographicsDesc: 'Provided your background and experience with AI/ML tools',
      
      task1: 'Task 1: Customer Review Analysis',
      task1Desc: 'Analyzed wireless headphone reviews using your assigned tool',
      
      survey1: 'Post-Task Survey 1',
      survey1Desc: 'Shared your experience and feedback after Task 1',
      
      task2: 'Task 2: Customer Review Analysis',
      task2Desc: 'Analyzed running shoe reviews using your assigned tool',
      
      survey2: 'Post-Task Survey 2',
      survey2Desc: 'Shared your experience and feedback after Task 2',
      
      workflowBuilder: 'Workflow Builder',
      aiAssistant: 'AI Assistant'
    },
    
    contact: {
      title: 'Questions or Comments?',
      message: 'If you have any questions about the study or would like to learn more about the research, please feel free to reach out:',
      email: 'benedikt.mast@stud.tu-darmstadt.de'
    },
    
    footer: 'You may now close this window.'
  },
  // ========== SUMMARY ==========
  summary: {
    modal: {
      title: "Task {{taskNumber}} Analysis Summary",
      subtitle: "{{count}} records analyzed • {{date}}",
      close: "Close summary",
      closeButton: "Close",
      footer: "Sections: {{available}} / {{requested}}"
    },
    sections: {
      executiveSummary: {
        title: "Executive Summary",
        basedOn: "Based on {{count}} records"
      },
      themes: {
        title: "Key Themes",
        prevalence: "Prevalence",
        mentions: "{{count}} mentions",
        summary: "{{totalThemes}} themes identified from {{recordsAnalyzed}} records",
        bySentiment: "Themes by Sentiment",
        aggregated: "Aggregated Themes",
        positive: "Positive Themes",
        neutral: "Neutral Themes",
        negative: "Negative Themes"
      },
      recommendations: {
        title: "Recommendations",
        impact: "Impact",
        totalCount: "{{count}} recommendations",
        highPriorityCount: "{{count}} high priority"
      },
      statistics: {
        title: "Statistics & Metrics",
        sentimentDistribution: {
          title: "Sentiment Distribution"
        },
        ratingDistribution: {
          title: "Rating Distribution",
          averageRating: "Average Rating"
        },
        themeCoverage: {
          title: "Top Themes Identified",
          totalThemes: "{{count}} total themes identified"
        },
        additionalStats: {
          totalReviews: "Total Reviews",
          verified: "Verified",
          avgBodyLength: "Avg Body Length",
          consistency: "Consistency"
        },
        sentimentConsistency: {
          title: "Sentiment-Rating Consistency",
          totalCompared: "Total Compared",
          aligned: "Aligned",
          misaligned: "Misaligned",
          consistency: "Consistency",
          misalignmentPatterns: "Misalignment Patterns",
          highRatingNegative: "High Rating + Negative",
          lowRatingPositive: "Low Rating + Positive",
          neutralExtremes: "Neutral Rating + Extremes"
        }
      },
      dataPreview: {
        title: "Data Preview",
        showing: "Showing {{preview}} of {{total}} records",
        columns: {
          reviewId: "Review ID",
          headline: "Headline",
          rating: "Rating",
          sentiment: "Sentiment",
          verified: "Verified"
        },
        reviewBody: "Review Body"
      }
    }
  },
  // ========== CHAT EXECUTION ==========
  execution: {
    tool: {
      // Tool: load-reviews
      'load-reviews': {
        start: {
          default: 'Loading review data…',
          start:   'Loading {{category}} reviews…'
        },
        progress: {
          default: 'Processing reviews…',
          running: 'Loading reviews…',
          loading: 'Loaded {{records_loaded}} of {{total_available}} reviews…'
        },
        end: {
          default: 'Reviews loaded successfully',
          completed: 'Successfully loaded {{records_loaded}} {{category}} reviews'
        },
        error: {
          default: 'Failed to load reviews',
          failed: 'Failed to load reviews',
          exception: 'Error loading reviews'
        }
      },

      // Tool: clean-data
      'clean-data': {
        start: {
          default: 'Cleaning data…',
          start: 'Starting data cleaning…'
        },
        progress: {
          default: 'Cleaning in progress…',
          running: 'Processing data…',
          // keeping your detailed bullets and placeholders
          missing_data_complete: '      ➜ Removed {{data.removed}} reviews with missing data',
          spam_complete: '      ➜ Removed {{data.removed}} reviews with malformed data',
          duplicates_complete: '      ➜ {{data.removed}} duplicate reviews found',
        },
        end: {
          default: 'Data cleaning complete',
          completed: 'Cleaning finished'
        },
        error: {
          default: 'Failed to clean data',
          failed: 'Failed to clean data',
          exception: 'Error cleaning data'
        }
      },
      
      // Tool: filter-reviews
      'filter-reviews': {
        start: {
          default: 'Filtering reviews…',
          start: 'Applying filters…'
        },
        progress: {
          default: 'Filtering in progress…',
          running: 'Scanning reviews…'
        },
        end: {
          default: 'Reviews filtered',
          completed: 'Filtered to {{count}} reviews'
        },
        error: {
          default: 'Failed to filter reviews',
          failed: 'Failed to filter reviews',
          exception: 'Error filtering reviews'
        }
      },
      
      // Tool: sort-reviews
      'sort-reviews': {
        start: {
          default: 'Sorting reviews…',
          start: 'Starting sort operation…'
        },
        progress: {
          default: 'Sorting in progress…',
          running: 'Organizing reviews…'
        },
        end: {
          default: 'Reviews sorted',
          completed: 'Sorting complete'
        },
        error: {
          default: 'Failed to sort reviews',
          failed: 'Failed to sort reviews',
          exception: 'Error sorting reviews'
        }
      },
      
      // Tool: review-sentiment-analysis
      'review-sentiment-analysis': {
        start: {
          default: 'Analyzing sentiment…',
          start: 'Starting sentiment analysis…'
        },
        progress: {
          default: 'Processing reviews…',
          running: 'Analyzing sentiment…',
          LLM_handoff: '    Analyzing sentiment and extracting themes.\\n    Processing time varies with dataset size and current service load (typically 30-90 seconds).'
        }, 
        end: {
          default: 'Sentiment analysis complete',
          completed: 'Analysis complete'
        },
        error: {
          default: 'Failed to analyze sentiment',
          failed: 'Failed to analyze sentiment',
          exception: 'Error analyzing sentiment'
        }
      },
      
      // Tool: generate-insights
      'generate-insights': {
        start: {
          default: 'Generating insights…',
          start: 'Starting insight generation…'
        },
        progress: {
          default: 'Processing data…',
          running: 'Generating insights…',
          LLM_handoff: '    Generating actionable insights from analysis.\\n    Processing time may vary based on data complexity and current service load.'
        },
        end: {
          default: 'Insights generated',
          completed: 'Insight generation complete'
        },
        error: {
          default: 'Failed to generate insights',
          failed: 'Failed to generate insights',
          exception: 'Error generating insights'
        }
      },
      
      // Tool: show-results
      'show-results': {
        start: {
          default: 'Preparing results…',
          start: 'Loading results…'
        },
        progress: {
          default: 'Formatting output…',
          running: 'Preparing display…',
          LLM_handoff: '    Compiling executive summary with main takeaways.\\nNearly done—just formatting the final report.'
        },
        end: {
          default: 'Results ready',
          completed: 'Results displayed'
        },
        error: {
          default: 'Failed to show results',
          failed: 'Failed to show results',
          exception: 'Error showing results'
        }
      },
      
      // Default tool (fallback)
      default: {
        start: {
          default: 'Starting tool…',
          start: 'Starting tool…'
        },
        progress: {
          default: 'Processing…',
          running: '{{tool_name}} running…',
        },
        end: {
          default: 'Tool completed',
          completed: 'Completed successfully'
        },
        error: {
          default: 'Tool failed',
          failed: 'Tool failed',
          exception: 'Tool error'
        }
      }
    },

    // ============================================
    // TYPE: NODE
    // ============================================
    node: {
      'load-reviews': {
        start: {
          default: 'Starting step…',
          start: '{{data.step_number}}. Loading reviews…'
        },
        progress: {
          default: 'Processing…',
          running: '{{node_label}} running…'
        },
        end: {
          default: 'Step completed',
          completed: '    Successfully loaded {{data.results.total}} reviews.\\n',
          failed: '{{node_label}} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{{data.error}}',
          exception: '{{data.error}}'
        }
      },
      'clean-data': {
        start: {
          default: 'Starting step…',
          start: '{{data.step_number}}. Cleaning reviews…'
        },
        progress: {
          default: 'Processing…',
          running: '{{node_label}} running…'
        },
        end: {
          default: 'Step completed',
          completed: '    Successfully removed {{data.results.summary.total_removed}} low-quality reviews.\\n    Remaining reviews: {{data.results.summary.records_after}}.\\n    Data quality: {{data.results.summary.quality_score}}%.\\n',
          failed: '{{node_label}} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{{data.error}}',
          exception: '{{data.error}}'
        }
      },
      'filter-reviews': {
        start: {
          default: 'Starting step…',
          start: '{{data.step_number}}. Filtering reviews…'
        },
        progress: {
          default: 'Processing…',
          running: '{{node_label}} running…'
        },
        end: {
          default: 'Step completed',
          completed: '    Successfully filtered reviews.\\n    Removed {{data.results.summary.records_removed}} non matching reviews.\\n    Remaining reviews: {{data.results.summary.records_after}}.\\n',
          failed: '{{node_label}} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{{data.error}}',
          exception: '{{data.error}}'
        }
      },
      'sort-reviews': {
        start: {
          default: 'Starting step…',
          start: '{{data.step_number}}. Sorting reviews…'
        },
        progress: {
          default: 'Processing…',
          running: '{{node_label}} running…'
        },
        end: {
          default: 'Step completed',
          completed: '    Successfully sorted by {{data.results.summary.sort_field}} in {{data.results.summary.sort_order}} order.\\n',
          failed: '{{node_label}} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{{data.error}}',
          exception: '{{data.error}}'
        }
      },
      'review-sentiment-analysis': {
        start: {
          default: 'Starting step…',
          start: '{{data.step_number}}. Analyzing sentiment and extracting themes…'
        },
        progress: {
          default: 'Processing…',
          running: '{{node_label}} running…'
        },
        end: {
          default: 'Step completed',
          completed: '{{node_label}} completed\\n',
          failed: '{{node_label}} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{{node_label}} failed',
          exception: '{{node_label}} error'
        }
      },
      'generate-insights': {
        start: {
          default: 'Starting step…',
          start: '{{data.step_number}}. Generating insights…'
        },
        progress: {
          default: 'Processing…',
          running: '{{node_label}} running…'
        },
        end: {
          default: 'Step completed',
          completed: '{{node_label}} completed\\n',
          failed: '{{node_label}} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{{node_label}} failed',
          exception: '{{node_label}} error'
        }
      },
      'show-results': {
        start: {
          default: 'Starting step…',
          start: '{{data.step_number}}. Preparing results…'
        },
        progress: {
          default: 'Processing…',
          running: '{{node_label}} running…'
        },
        end: {
          default: 'Step completed',
          completed: '    Results ready to view\\n',
          failed: '{{node_label}} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{{data.error}}',
          exception: '{{data.error}}'
        }
      },
      // Default node config (fallback)
      default: {
        start: {
          default: 'Starting step…',
          start: '{{data.step_number}}. {{data.node_label}}…'
        },
        progress: {
          default: 'Processing…',
          running: '{{node_label}} running…'
        },
        end: {
          default: 'Step completed',
          completed: '{{node_label}} completed\\n',
          failed: '{{node_label}} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{{node_label}} failed',
          exception: '{{node_label}} error'
        }
      }
    },

    // ============================================
    // TYPE: EXECUTION (meta)
    // ============================================
    execution: {
      start: {
        default: 'Starting execution…',
        start: 'Execution started'
      },
      progress: {
        default: 'Executing…',
        running: 'Execution in progress…'
      },
      end: {
        default: 'Execution complete',
        failed: 'Execution failed',
        completed: 'Execution completed'
      },
      error: {
        default: 'Execution failed',
        failed: 'Execution failed',
        exception: 'Execution error'
      }
    },

    // ============================================
    // TYPE: AGENT
    // ============================================
    agent: {
      start: {
        default: 'Agent starting…',
        start: 'Agent starting…',
        running: 'Agent analyzing task…'
      },
      progress: {
        default: 'Agent working…',
        running: 'Agent processing…',
        decision: '{{data.decision}}\\n'
      },
      chat: {
        default: '{{content}}',
        completed: '{{content}}'
      },
      end: {
        default: 'Agent finished',
        completed: '{{summary}}'
      },
      error: {
        default: 'Agent failed',
        failed: 'Agent failed',
        exception: 'Agent error'
      }
    }
  },
  // ========== ADMIN ==========
  admin: {
    sidebar: {
      dashboard: 'Dashboard',
      builder: 'Workflow Builder',
      aiChat: 'AI Assistant',
      templates: 'Templates',
      executions: 'Executions',
      analytics: 'Analytics',
      tutorials: 'Tutorials',
      settings: 'Settings'
    }
  }
};