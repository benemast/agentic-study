// frontend/src/locales/de.js
export const de = {
  common: {
    form: {
      pleaseSelect: 'Bitte auswählen...',
      required: 'Dieses Feld ist erforderlich',
      optional: '(optional)'
    },
    
    validation: {
      required: 'Dieses Feld ist erforderlich',
      invalidEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
      minLength: 'Muss mindestens {{min}} Zeichen lang sein',
      maxLength: 'Darf maximal {{max}} Zeichen lang sein',
      numberOnly: 'Bitte nur Zahlen eingeben'
    },
    
    navigation: {
      previous: 'Zurück',
      next: 'Weiter',
      continue: 'Fortfahren',
      back: 'Zurück',
      submit: 'Absenden',
      cancel: 'Abbrechen',
      save: 'Speichern',
      close: 'Schließen'
    }
  },
  base:{
    university: {
      name: "Technical University of Darmstadt",
      chair: "Lehrstuhl Wirtschaftsinformatik | Software & AI"
    }
  },
  footer: {
    legalNote: {
      label: "Impressum",
      url: "https://www.tu-darmstadt.de/impressum/index.de.jsp"
    },
    note:"The study takes approximately 45-60 minutes. Your progress is automatically saved.",
    contact: "Bei Fragen zur Studie oder Problemen bitte an [EMAIL] wenden."
  },
  
  // ========================================
  // WELCOME SCREEN (NEW)
  // ========================================
  welcome: {
    title: "Willkommen zur User Study",
    subtitle: "Forschung zu Agentic AI Workflow Design",
    description: "Helfen Sie uns zu verstehen, wie Menschen mit verschiedenen KI-Systemen interagieren und zusammenarbeiten.",
    
    whatYouWillDo: {
      title: "Was Sie erwartet:",
      explore: "Erkunden Sie zwei verschiedene KI-gestützte Arbeitsumgebungen",
      create: "Erstellen Sie Workflows oder arbeiten Sie mit einem KI-Assistenten",
      test: "Testen und iterieren Sie Ihre Lösungen",
      complete: "Teilen Sie Ihre Erfahrungen durch kurze Umfragen"
    },
    
    duration: {
      label: "Dauer",
      value: "45-60 Minuten"
    },

    legalNote: {
      lable: "Legal note"

    },
    
    privacy: {
      label: "Datenschutz",
      value: "Anonym & DSGVO-konform"
    },
    
    privacyModal: {
      title: "Datenschutzerklärung",
      content: "Detaillierte Informationen zum Datenschutz findest du in unserer vollständigen Datenschutzerklärung unter: ",
      url: "https://www.tu-darmstadt.de/datenschutzerklaerung.de.jsp",
      close: "Schließen"
    },
    
    privacyNotice: {
      title: "Datenschutzhinweis",
      intro: "Ihre Teilnahme an dieser Studie ist vollkommen freiwillig und anonym. Wir erheben folgende Daten:",
      data1: "Demografische Informationen (ohne personenbezogene Identifikatoren)",
      data2: "Interaktionsmuster und Nutzungsverhalten",
      data3: "Workflow-Designs und Feedback",
      gdpr: "Alle Daten werden in Übereinstimmung mit der DSGVO verarbeitet und ausschließlich für Forschungszwecke verwendet. Sie können jederzeit ohne Angabe von Gründen von der Studie zurücktreten.",
      viewFull: "Vollständige Datenschutzerklärung anzeigen"
    },
    
    consent: {
      title: "Ich stimme der Teilnahme zu",
      text: "Ich habe die Studieninformationen und den Datenschutzhinweis gelesen und verstanden. Ich nehme freiwillig an dieser Studie teil und weiß, dass ich jederzeit ohne Angabe von Gründen zurücktreten kann."
    },
    
    continue: "Weiter zur Studie"    
  },
  workflow: {
    builder: {
      title: "Forschungs-Workflow",
      addNode: "Knoten hinzufügen",
      addNodes: "Knoten hinzufügen",
      dragToAdd: "Auf Canvas ziehen zum Hinzufügen", 
      nodeCategories: {
        input: "EINGABE",
        processing: "VERARBEITUNG",
        logic: "LOGIK", 
        analysis: "ANALYSE",
        ai: "KI",
        output: "AUSGABE"
      },
      nodes: {
        loadData: "Daten laden",
        filterData: "Daten filtern",
        cleanData: "Daten bereinigen", 
        sortData: "Daten sortieren",
        logicIf: "Logik Wenn",
        combineData: "Daten kombinieren",
        sentimentAnalysis: "Sentiment-Analyse",
        generateInsights: "Erkenntnisse generieren",
        showResults: "Ergebnisse anzeigen"
      },
      nodeTypes: {
        dataInput: "Dateneingabe",
        dataProcessing: "Datenverarbeitung",
        conditional: "Bedingung",
        analysis: "Analyse", 
        aiOperation: "KI-Operation",
        output: "Ausgabe"
      },
      toolbar: {
        save: "Speichern",
        clear: "Leeren",
        settings: "Einstellungen",
        execute: "Ausführen"
      },
      status: {
        ready: "Bereit zur Ausführung",
        emptyWorkflow: "Leerer Workflow",
        missingInput: "Eingabeknoten fehlt",
        missingOutput: "Ausgabeknoten fehlt", 
        noConnections: "Keine Verbindungen",
        incompleteWorkflow: "Unvollständiger Workflow"
      },
      statusDetails: {
        addNodes: "Fügen Sie Knoten hinzu, um Ihren Workflow zu erstellen",
        addInput: "Fügen Sie einen Dateneingabeknoten hinzu, um Ihren Workflow zu starten",
        addOutput: "Fügen Sie einen Ausgabeknoten hinzu, um Ihren Workflow zu vervollständigen",
        connectNodes: "Verbinden Sie Ihre Knoten, um einen Workflow-Pfad zu erstellen",
        createPath: "Erstellen Sie einen Pfad von Eingabe- zu Ausgabeknoten",
        nodesConnected: "{{count}} Knoten ordnungsgemäß verbunden"
      },
      emptyState: {
        title: "Beginnen Sie mit der Erstellung Ihres Workflows",
        description: "Ziehen Sie Knoten aus der Seitenleiste und legen Sie sie ab, um Ihren Forschungsautomatisierungs-Workflow zu erstellen.",
        addFirstNode: "Ihren ersten Knoten hinzufügen"
      },
      connectionHelper: {
        connecting: "Ziehen zum Verbinden von Knoten • Grün = Gültiges Ziel • Grau = Ungültig"
      },
      nodeEditor: {
        title: "Knoten bearbeiten",
        label: "Bezeichnung",
        description: "Beschreibung",
        cancel: "Abbrechen", 
        save: "Speichern"
      }
    },
    sidebar: {
      dashboard: "Dashboard",
      builder: "Workflow-Builder",
      aichat: "KI-Assistent",
      templates: "Vorlagen",
      executions: "Ausführungen",
      analytics: "Analysen",
      tutorials: "Anleitungen",
      settings: "Einstellungen"
    },
    notifications: {
      nodeAdded: "Knoten erfolgreich hinzugefügt",
      nodeDeleted: "Knoten gelöscht",
      nodeSaved: "Knoten gespeichert",
      connectionAdded: "Verbindung erstellt",
      connectionDeleted: "Verbindung entfernt",
      connectionFailed: "Verbindung konnte nicht erstellt werden",
      validationFailed: "Workflow-Validierung fehlgeschlagen",
      maxNodesReached: "Maximale Anzahl von Knoten ({{max}}) erreicht",
      maxEdgesReached: "Maximale Anzahl von Verbindungen ({{max}}) erreicht",
      sourceHandleMaxReached: "Quell-Handle hat bereits maximal {{max}} Verbindung{{max === 1 ? '' : 'en'}}",
      targetHandleMaxReached: "Ziel-Handle hat bereits maximal {{max}} Verbindung{{max === 1 ? '' : 'en'}}",
      workflowExecuted: "Workflow mit {{nodes}} Knoten und {{connections}} Verbindungen ausgeführt",
      workflowCleared: "Workflow gelöscht",
      workflowSaved: "Workflow gespeichert: {{nodes}} Knoten, {{connections}} Verbindungen",
    }
  },
  demographics: {
    progress: {
      step: 'Schritt {{current}} von {{total}}',
      complete: 'abgeschlossen'
    },
    
    navigation: {
      readyToStart: 'Bereit anzufangen?',
      continueWhenReady: 'Fortfahren, wenn Sie bereit sind',
      almostDone: 'Fast fertig!',
      completeAndContinue: 'Abschließen & Fortfahren'
    },
    
    privacyNote: 'Alle Antworten sind anonym und werden ausschließlich für Forschungszwecke verwendet. Sie können alle optionalen Fragen überspringen, die Sie nicht beantworten möchten.',
    
    basicInfo: {
      title: 'Grundlegende Informationen',
      description: 'Erzählen Sie uns ein wenig über sich',
      
      country: {
        label: 'Land/Region (optional)',
        placeholder: 'z.B. Deutschland, Vereinigte Staaten, Brasilien, etc.'
      },
      
      firstLanguage: {
        label: 'Muttersprache (optional)',
        placeholder: 'z.B. Deutsch, Englisch, Spanisch, Mandarin, etc.'
      },
      age: {
        label: "Altersgruppe",
        preferNotToSay: "Keine Angabe"
      },
      gender: {
        label: "Geschlechtsidentität",
        woman: "Frau",
        man: "Mann",
        nonBinary: "Nicht-binär",
        other: "Anderes",
        preferNotToSay: "Keine Angabe"
      },
      education: {
        label: "Höchster Bildungsabschluss",
        highSchool: "Gymnasium / Sekundarbildung",
        someCollege: "Teilweise Hochschule / Universität",
        bachelors: "Bachelor-Abschluss",
        masters: "Master-Abschluss",
        phd: "PhD / Doktorgrad",
        other: "Anderes"
      },
      fieldOfStudy: {
        label: "Studienrichtung",
        placeholder: "z.B. Informatik, Psychologie, Ingenieurswesen, etc."
      },
      occupation: {
        label: "Aktueller Beruf / Fachbereich",
        placeholder: "z.B. Software-Ingenieur, Student, Forscher, etc."
      }
    },
    technicalBackground: {
      title: 'Technischer Hintergrund',
      description: 'Helfen Sie uns, Ihre technische Erfahrung zu verstehen',
      
      programming: {
        label: 'Programmiererfahrung',
        none: 'Keine Programmiererfahrung',
        beginner: 'Anfänger (< 1 Jahr)',
        intermediate: 'Fortgeschritten (1-3 Jahre)',
        advanced: 'Erfahren (3-7 Jahre)',
        expert: 'Experte (7+ Jahre)'
      },
      
      aiMl: {
        label: 'KI/ML-Erfahrung',
        none: 'Keine KI/ML-Erfahrung',
        beginner: 'Anfänger - etwas Kontakt/Lernen',
        intermediate: 'Fortgeschritten - einige KI/ML-Projekte erstellt',
        advanced: 'Erfahren - professionelle KI/ML-Arbeit',
        expert: 'Experte - KI/ML-Spezialist/Forscher'
      },
      
      workflowTools: {
        label: 'Verwendete Workflow-/Automatisierungstools (alle zutreffenden auswählen)',
        other: 'Andere',
        none: 'Keine davon'
      },
      
      technicalRole: {
        label: 'Beschreibt Ihre technische Rolle am besten',
        softwareEngineer: 'Software-Ingenieur',
        frontendDeveloper: 'Frontend-Entwickler',
        backendDeveloper: 'Backend-Entwickler',
        fullstackDeveloper: 'Full-Stack-Entwickler',
        devopsEngineer: 'DevOps-Ingenieur',
        dataScientist: 'Data Scientist',
        dataEngineer: 'Data Engineer',
        mlEngineer: 'ML-Ingenieur',
        aiResearcher: 'KI-Forscher',
        academicResearcher: 'Akademischer Forscher',
        productManager: 'Product Manager',
        projectManager: 'Projektmanager',
        uxDesigner: 'UX-Designer',
        uiDesigner: 'UI-Designer',
        student: 'Student',
        businessAnalyst: 'Business Analyst',
        qaEngineer: 'QA/Test-Ingenieur',
        systemArchitect: 'System-/Lösungsarchitekt',
        consultant: 'Berater',
        entrepreneur: 'Unternehmer/Gründer',
        otherTechnical: 'Andere technische Rolle',
        nonTechnical: 'Nicht-technische Rolle'
      },
      
      comments: {
        label: 'Zusätzliche Kommentare (optional)',
        placeholder: 'Weitere Informationen, die Sie teilen möchten, oder Fragen zur Studie...'
      }
    },
    
    studyContext: {
      title: 'Studienkontext',
      
      motivation: {
        label: 'Was hat Sie zur Teilnahme an dieser Studie motiviert?',
        placeholder: 'z.B. Interesse an KI, Forschungsteilnahme, Lernen über Workflow-Tools...'
      },
      
      expectations: {
        label: 'Was erhoffen Sie sich zu lernen oder zu erfahren?',
        placeholder: 'Ihre Erwartungen an die Studie und den Workflow-Builder...'
      },
      
      timeAvailability: {
        label: 'Wie viel Zeit haben Sie heute zur Verfügung?',
        short: '15-30 Minuten',
        medium: '30-45 Minuten',
        long: '45-60 Minuten',
        veryLong: 'Mehr als 60 Minuten',
        flexible: 'Flexibel - Ich kann pausieren und später fortsetzen'
      }
    },
    
    optionalInfo: {
      title: 'Optionale Informationen',
      
      country: {
        label: 'Land/Region (optional)',
        placeholder: 'z.B. Deutschland, Vereinigte Staaten, etc.'
      },
      
      firstLanguage: {
        label: 'Muttersprache (optional)',
        placeholder: 'z.B. Deutsch, Englisch, Spanisch, etc.'
      },
      
      comments: {
        label: 'Zusätzliche Kommentare (optional)',
        placeholder: 'Weitere Informationen, die Sie teilen möchten, oder Fragen zur Studie...'
      }
    }
  }
};