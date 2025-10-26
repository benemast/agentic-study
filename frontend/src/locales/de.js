// frontend/src/locales/de.js
export const de = {
  // ========== COMMON ==========
  common: {
    form: {
      pleaseSelect: 'Bitte auswählen...',
      selectOption: 'Bitte auswählen...',
      required: 'Dieses Feld ist erforderlich',
      optional: '(optional)'
    },
    
    validation: {
      required: 'Dieses Feld ist erforderlich',
      pleaseFillRequired: 'Bitte fülle alle erforderlichen Felder aus, bevor du fortfährst',
      invalidEmail: 'Bitte gib eine gültige E-Mail-Adresse ein',
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
  // ========== BASE ==========
  base:{
    university: {
      name: 'Technische Universität Darmstadt',
      chair: 'Lehrstuhl Wirtschaftsinformatik | Software & AI Business'
    },
    studyConfig:{
      Error:{
        label: 'Konfigurationsfehler',
        text: 'Die Studienkonfiguration konnte nicht geladen werden. Bitte lade die Seite neu.',
        reload: 'Seite neu laden'
      },
      init: 'Initialisiere Studie...'
    }    
  },
  // ========== FOOTER ==========
  footer: {
    legalNote: {
      label: 'Impressum',
      url: 'https://www.tu-darmstadt.de/impressum/index.de.jsp'
    },
    note:'Die Studie dauert ca. 45-60 Minuten. Dein Fortschritt wird automatisch gespeichert.',
    contact: 'Bei Fragen zur Studie oder Problemen wende dich bitte an [EMAIL].'
  },
  // ========== WELCOME ==========
  welcome: {
    title: 'Willkommen zur User Study',
    subtitle: 'Forschung zu Agentic AI Workflow Design',
    description: 'Hilf uns zu verstehen, wie Menschen mit verschiedenen KI-Systemen interagieren und zusammenarbeiten.',
    
    whatYouWillDo: {
      title: 'Was dich erwartet:',
      explore: 'Erkunde zwei verschiedene KI-gestützte Arbeitsumgebungen',
      create: 'Erstelle Workflows oder arbeite mit einem KI-Assistenten',
      test: 'Teste und iteriere deine Lösungen',
      complete: 'Teile deine Erfahrungen durch kurze Umfragen'
    },
    studyInfo: {
      title: 'Studieninformationen',
      description: 'Diese Studie vergleicht verschiedene KI-Kollaborationsansätze, um zu verstehen, wie Menschen mit KI-gestützten Systemen arbeiten.',
      whatYouWillDo: {
        title: 'Was dich erwartet:',
        step1: 'Einen kurzen demografischen Fragebogen ausfüllen',
        step2: 'Mit zwei verschiedenen KI-gestützten Systemen arbeiten',
        step3: 'Feedback zu deiner Erfahrung geben'
      },
      contactInfo:{
        title: 'Kontaktinformation',
        description: 'Bei Fragen sende uns gerne jederzeit eine E-Mail:'
      },
      duration: {
        label: 'Geschätzte Dauer',
        time: '45-60 Minuten',
        note: 'Dein Fortschritt wird automatisch gespeichert. Du kannst bei Bedarf Pausen machen.'
      }
    },

    legalNote: {
      lable: 'Impressum'
    },
    
    privacy: {
      label: 'Datenschutz',
      value: 'Anonym & DSGVO-konform',
      url: 'https://www.tu-darmstadt.de/datenschutzerklaerung.de.jsp'
    },
    
    privacyNotice: {
      title: 'Datenschutzinformation',
      mainText: 'Die Datenverarbeitung dieser Studie geschieht nach datenschutzrechtlichen Bestimmungen der Datenschutzgrundverordnung (DSGVO) sowie des Hessischen Datenschutz- und Informationsfreiheitsgesetzes (HDSIG). Die Daten werden ausschließlich für die im Aufklärungsbogen beschriebenen Zwecke verwendet. Wir versichern, dass die erhobenen Daten vollständig anonymisiert gespeichert und ausgewertet werden. Es ist nicht möglich, Rückschlüsse auf deine Identität zu ziehen.',
      researchPurpose: 'Die Daten werden von den Forscher:innen ausschließlich für nicht-kommerzielle Forschungszwecke verwendet und nicht an Dritte weitergegeben oder in andere Länder als Deutschland übertragen. Die ausgewerteten Forschungsergebnisse werden in aggregierter Form in einem wissenschaftlichen Beitrag veröffentlicht.',
      keyPoints: {
        title: 'Wichtigste Punkte:',
        anonymous: 'Vollständig anonymisierte Datenerhebung und -speicherung',
        gdprCompliant: 'DSGVO- und HDSIG-konform',
        voluntary: 'Freiwillige Teilnahme mit jederzeitigem Widerrufsrecht',
        retention: 'Datenspeicherung für 3 Jahre, dann Löschung'
      },
      viewFullPolicy: 'Vollständige Datenschutzerklärung anzeigen'
    },
    
    privacyModal: {
      title: 'Datenschutzinformation',
      content: {
        mainText: 'Die Datenverarbeitung dieser Studie geschieht nach datenschutzrechtlichen Bestimmungen der Datenschutzgrundverordnung (DSGVO) sowie des Hessischen Datenschutz- und Informationsfreiheitsgesetzes (HDSIG). Die Daten werden ausschließlich für die im Aufklärungsbogen beschriebenen Zwecke verwendet. Wir versichern, dass die erhobenen Daten vollständig anonymisiert gespeichert und ausgewertet werden. Es ist nicht möglich, Rückschlüsse auf deine Identität zu ziehen.',
        researchPurpose: 'Die Daten werden von den Forscher:innen ausschließlich für nicht-kommerzielle Forschungszwecke verwendet und nicht an Dritte weitergegeben oder in andere Länder als Deutschland übertragen. Die ausgewerteten Forschungsergebnisse werden in aggregierter Form in einem wissenschaftlichen Beitrag veröffentlicht.'
      },
      sections: {
        additionalInfo: {
          title: 'Mehr Informationen über die Verarbeitung deiner personenbezogenen Daten'
        },
        retention: {
          title: 'Wie lange werden die personenbezogenen Daten verarbeitet',
          content: '3 Jahr(e)'
        },
        categories: {
          title: 'Welche besondere Kategorien personenbezogener Daten werden erfasst und verarbeitet',
          content: 'Die Teilnehmenden an dieser Studie werden keinem Risiko ausgesetzt, das über die Risiken des alltäglichen Lebens hinausgeht.'
        },
        legalBasis: {
          title: 'Gesetzliche Grundlage für die Verarbeitung',
          content: 'Einwilligung des Betroffenen, Art. 6 Abs. 1 lit. a DSGVO'
        },
        recipients: {
          title: 'Empfänger und Kategorien von Empfängern von personenbezogenen Daten',
          content: 'Die Daten werden vom Fachgebiet Wirtschaftsinformatik | Software & AI Business an der TU Darmstadt genutzt und nicht an Dritte weitergegeben.'
        },
        dataTransfer: {
          title: 'Datenübermittlung in ein Land außerhalb der EU/EWR oder an eine internationale Organisation, und Datenübermittlung vorbehaltlich geeigneter Garantien',
          content: 'Die mit dieser Studie erhobenen Daten werden in der TU Darmstadt gespeichert und nach drei Jahren gelöscht. Die Speicherung erfolgt in einer Form, die keinen Rückschluss auf deine Person zulässt, das heißt die Daten werden anonymisiert oder pseudonymisiert. Diese Einverständniserklärung wird getrennt von den anderen Versuchsmaterialien und Unterlagen aufbewahrt und nach Ablauf dieser Frist vernichtet. Es wird angestrebt, die Ergebnisse der Studie in Journals und Konferenzbeiträgen zu veröffentlichen. Die Ergebnisse der Studie werden über die genannten Löschfristen hinaus der Öffentlichkeit zugänglich gemacht.'
        },
        confidentiality: {
          title: 'Gesetzliche oder vertragliche Auflage',
          content: 'Alle im Rahmen dieser Studie erhobenen Daten sind selbstverständlich vertraulich und werden nur in anonymisierter Form genutzt. Demographische Angaben wie Alter oder Geschlecht lassen keinen eindeutigen Schluss auf deine Person zu. Zu keinem Zeitpunkt im Rahmen der jeweiligen Untersuchung werden wir dich bitten, deinen Namen oder andere eindeutige Informationen zu nennen.'
        },
        rights: {
          title: 'Information zu den Rechten der Datensubjekte',
          content: 'Du hast das Recht, Auskunft über die dich betreffenden personenbezogenen Daten zu erhalten sowie ggf. deren Berichtigung oder Löschung zu verlangen. In Streitfällen hast du das Recht, dich beim Hessischen Datenschutzbeauftragten zu beschweren. Deine Teilnahme an dieser Untersuchung ist freiwillig. Es steht dir zu jedem Zeitpunkt dieser Studie frei, deine Teilnahme abzubrechen und damit diese Einwilligung zurückziehen (Widerruf), ohne dass dir daraus Nachteile entstehen. Wenn du die Teilnahme abbrechen möchtest, werden keine Daten von dir gespeichert und alle bisher vorliegenden Daten zu deiner Person vernichtet.'
        },
        withdrawal: {
          title: 'Information über das Recht, die Zustimmung zu widerrufen',
          content: 'Wie in Art. 7 Abs. 3 DSGVO hast du das Recht, deine Einwilligung zur Verarbeitung der personenbezogenen Daten jederzeit zu widerrufen. Durch den Widerruf der Einwilligung wird die Rechtmäßigkeit, der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung nicht berührt.'
        },
        authority: {
          title: 'Datenschutzbehörde',
          content: 'Du kannst eine Beschwerde bei der zuständigen Aufsichtsbehörde einreichen, wenn du der Meinung bist, dass wir uns nicht an die Offenlegungsvorschriften halten.'
        },
        dpo: {
          title: 'Unser Datenschutzbeauftragter',
          content: 'Jan Hansen, Technische Universität Darmstadt, Datenschutzbeauftragter'
        }
      },
      tuLink: {
        label: 'Weitere Information',
        text: 'Datenschutzerklärung der TU Darmstadt'
      }
    },

    consent: {
      title: 'Ich stimme der Teilnahme zu',
      text: 'Ich habe die Studieninformationen und die Datenschutzerklärung gelesen und verstanden. Ich nehme freiwillig an dieser Studie teil und weiß, dass ich jederzeit ohne Angabe von Gründen zurücktreten kann.'
    },
    
    continue: 'Weiter zur Studie'
  },
  // ========== DEMOGRAPHICS ==========
  demographics: {
    title: 'Demografischer Fragebogen',

    progress: {
      step: 'Schritt {{current}} von {{total}}',
      complete: 'abgeschlossen'
    },
    
    navigation: {
      readyToStart: 'Bereit zu starten?',
      continueWhenReady: 'Fortfahren, wenn bereit',
      almostDone: 'Fast fertig!',
      completeAndContinue: 'Abschließen & Fortfahren'
    },
    
    privacyNote: 'Alle Antworten sind anonym und werden nur für Forschungszwecke verwendet. Du kannst alle optionalen Fragen überspringen, die du nicht beantworten möchtest.',
    
    requiredNote: 'Mit [ASTERISK] markierte Angaben sind erforderlich.',

    basicInfo: {
      title: 'Grundlegende Informationen',
      description: 'Erzähl uns ein wenig über dich',
      age: {
        label: 'Altersgruppe',
        preferNotToSay: 'Möchte ich nicht angeben'
      },
      genderIdentity: {
        label: 'Geschlechtsidentität',
        woman: 'Weiblich',
        man: 'Männlich',
        nonBinary: 'Nicht-binär / Divers',
        other: 'Eine andere Bezeichnung',
        preferNotToSay: 'Möchte ich nicht angeben'
      },      
      country: {
        label: 'Land/Region (optional)',
        placeholder: 'z.B. Deutschland, Vereinigte Staaten, Brasilien, etc.'
      },
      
      firstLanguage: {
        label: 'Muttersprache (optional)',
        placeholder: 'z.B. Deutsch, Englisch, Spanisch, Mandarin, etc.'
      },
      education: {
        label:          'Höchster Bildungsabschluss',
        none:           'Kein formaler Abschluss',
        school:         'Schulabschluss (z. B. Haupt-/Realschule)',
        upperSecondary: 'Fachhochschulreife oder Allgemeines Abitur',
        vocational:     'Ausbildung oder berufliche Qualifikation',
        shortTertiary:  'Fach-/Meisterschule oder vergleichbare Qualifikation',
        bachelors:      'Bachelor oder vergleichbarer Abschluss',
        masters:        'Master, Diplom oder vergleichbarer Abschluss',
        phd:            'PhD oder Doktorgrad',
        other:          'Sonstiger Abschluss',
        preferNotToSay: 'Möchte ich nicht angeben'
      },
      fieldOfStudy: {
        label: 'Studienrichtung (optional)',
        placeholder: 'z.B. Informatik, Psychologie, Ingenieurswesen, etc.'
      }
    },
    professionalBackground: {
      title: 'Beruflicher Hintergrund',
      description: 'Help us understand your professional background',
      occupation: {
        label: 'Derzeitige Tätigkeit / Bereich (optional)',
        placeholder: 'z.B. Software-Ingenieur, Student, Forscher, etc.'
      },
      industry: {
        label: 'Branche',
        tech: 'Technologie',
        healthcare: 'Gesundheits- und Pflegewesen',
        finance: 'Finanzwesen',
        education: 'Bildung / Ausbildung',
        retail: 'Einzel- und Großhandel',
        manufacturing: 'Produktion / Fertigung',
        consulting: 'Beratung / Consulting',
        government: 'Öffentlicher Dienst / Verwaltung',
        nonprofit: 'Gemeinnütziger Bereich / Nonprofit',
        research: 'Forschung',
        student: 'Studium',
        other: 'Andere'
      },
      workExperience: {
        label: 'Gesamte Berufserfahrung',
        none: 'Keine',
        lessThan2: 'Bis 2 Jahre',
        threeToFive: '3 bis 5 Jahre',
        sixToTen: '6 bis 10 Jahre',
        moreThan10: 'Mehr als 10 Jahre'
      }

    },
    technicalBackground: {
      title: 'Technischer Hintergrund',
      description: 'Hilf uns, deine technische Erfahrung zu verstehen',
      
      technicalRole: {
        label: 'Beschreibt deine technische Rolle am besten (optional)',
        
        developer: 'Software-Entwickler*in / -Ingenieur*in',
        devopsEngineer: 'DevOps-Ingenieur*in',
        dataScientist: 'Data Scientist / Analyst*in',
        researcher: 'Wissenschaftler*in (Akademie / Industrie)',
        proManager: 'Produkt- / Projekt-Manager*in',
        designer: 'UX / UI-Designer*in',
        student: 'Student*in',
        businessAnalyst: 'Business Analyst*in',
        qaEngineer: 'QA / Test-Ingenieur*in',
        systemArchitect: 'System-/Solutions Architekt+in',
        consultant: 'Berater*in',
        entrepreneur: 'Unternehmer*in / Gründer*in',
        otherTechnical: 'Andere technische Rolle',
        nonTechnical: 'Nicht-technische Rolle'
      },
      
      programming: {
        label: 'Programmiererfahrung',
        none: 'Keine Programmiererfahrung',
        beginner: '< 1 Jahr Erfahrung',
        intermediate: '1-3 Jahre Erfahrung',
        advanced: '3-7 Jahre Erfahrung',
        expert: '7+ Jahre Erfahrung'
      },
      
      aiMl: {
        time:{
          label: 'Erfahrung mit Künstlicher Intelligenz (KI) und Machine Learning (ML)',
          description: 'Alltägliche KI-Nutzung zählt! Beispiele: ChatGPT Fragen stellen, KI-Schreibassistenten nutzen, Bilder mit DALL-E/Midjourney generieren, Sprachassistenten (Siri, Alexa) ausprobieren oder KI-Funktionen in Apps verwenden, die du nutzt.',
          none: 'Keine KI/ML-Erfahrung',
          beginner: '< 1 Jahr Erfahrung',
          intermediate: '1-3 Jahre Erfahrung',
          advanced: '3-7 Jahre Erfahrung',
          expert: '7+ Jahre Erfahrung'
        },
        level: {
          label: 'Wie würdest du deine KI/ML-Expertise einschätzen? (optional)',
          basic: 'Anfänger - etwas Kontakt/Lernen',
          intermediate: 'Fortgeschritten - einige KI/ML-Projekte erstellt',
          advanced: 'Erfahren - professionelle KI/ML-Arbeit',
          expert: 'Experte - KI/ML-Spezialist/Forscher'
        }
      },
      
      tools: {
        labelWorkflow: 'Verwendete Workflow-/Automatisierungstools (alle zutreffenden auswählen)',
        labelAI: 'Verwendete AI Tools (alle zutreffenden auswählen)',
        other: 'Andere',
        none: 'Keine'
      },
      
      comments: {
        label: 'Zusätzliche Kommentare (optional)',
        placeholder: 'Weitere Informationen, die Sie teilen möchten, oder Fragen zur Studie...'
      }
    },

    optionalInfo: {
      title: 'Optionale Informationen',
      comments: {
        label: 'Zusätzliche Kommentare (optional)',
        placeholder: 'Weitere Informationen, die du teilen möchtest, oder Fragen zur Studie...'
      }
    }
  },
  // ========== TASK ==========
  task: {
    header: {
      taskNumber: 'Aufgabe {{number}}',
      aiAssistant: 'KI-Assistent',
      workflowBuilder: 'Workflow-Builder',
      headphones: 'Kopfhörer',
      shoes: 'Schuhe',
      completeTooltip: 'Diese Aufgabe als abgeschlossen markieren',
      completeButton: 'Aufgabe abschließen'
    },
    
    description: {
      title: 'Aufgabenbeschreibung',
      collapse: 'Einklappen',
      expand: 'Ausklappen'
    },
    
    completion: {
      title: 'Aufgabe abschließen',
      message: 'Bist du sicher, dass du diese Aufgabe als abgeschlossen markieren möchtest? Diese Aktion kann nicht rückgängig gemacht werden.',
      confirm: 'Ja, Aufgabe abschließen',
      cancel: 'Abbrechen'
    }
  },

  // ========== SURVEY ==========
  survey: {
    title: 'Fragebogen nach der Aufgabe',
    conditionAI: 'KI-Assistent-Bedingung',
    conditionWorkflow: 'Workflow-Builder-Bedingung',
    description: 'Bitte beantworte die folgenden Fragen zu deiner Erfahrung mit der Aufgabe.',
    
    progress: {
      section: 'Abschnitt',
      of: 'von',
      complete: 'Abgeschlossen'
    },
    
    sections: {
      agency: 'Handlungsfähigkeit & Kontrolle',
      understanding: 'Verständnis & Transparenz',
      trust: 'Vertrauen & Zuversicht',
      effort: 'Kognitiver Aufwand',
      experience: 'Gesamterfahrung'
    },
    
    agency: {
      control: 'Ich hatte das Gefühl, die Ausführung der Aufgabe zu kontrollieren',
      autonomy: 'Ich hatte ausreichend Autonomie, um Entscheidungen zu treffen',
      influence: 'Ich konnte beeinflussen, wie die Aufgabe ausgeführt wurde',
      decisionMaking: 'Ich war aktiv an der Entscheidungsfindung beteiligt'
    },
    
    understanding: {
      systemBehavior: 'Ich habe verstanden, wie das System funktioniert',
      taskProgress: 'Ich konnte den Fortschritt meiner Aufgabe verfolgen',
      results: 'Die Ergebnisse wurden klar präsentiert',
      transparency: 'Das System war transparent in seinen Operationen'
    },
    
    trust: {
      reliability: 'Ich vertraue darauf, dass das System Aufgaben zuverlässig ausführt',
      accuracy: 'Ich glaube, dass die Ergebnisse genau sind',
      confidence: 'Ich fühle mich sicher bei der Nutzung dieses Systems',
      predictability: 'Das System verhielt sich vorhersehbar'
    },
    
    effort: {
      mentalDemand: 'Die Aufgabe erforderte hohen mentalen Aufwand',
      complexity: 'Das System war komplex zu bedienen',
      learning: 'Das Erlernen des Systems war einfach',
      efficiency: 'Ich konnte die Aufgabe effizient erledigen'
    },
    
    experience: {
      satisfaction: 'Ich bin mit meiner Gesamterfahrung zufrieden',
      enjoyment: 'Mir hat die Nutzung dieses Systems Spaß gemacht',
      frustration: 'Ich fühlte mich während der Aufgabe frustriert',
      recommendation: 'Ich würde dieses System anderen empfehlen'
    },
    
    likert: {
      stronglyDisagree: 'Stimme überhaupt nicht zu',
      disagree: 'Stimme nicht zu',
      neutral: 'Neutral',
      agree: 'Stimme zu',
      stronglyAgree: 'Stimme voll und ganz zu'
    },
    
    navigation: {
      previous: 'Zurück',
      next: 'Weiter',
      submit: 'Fragebogen absenden'
    },
    
    completion: {
      title: 'Fragebogen abgeschlossen',
      message: 'Vielen Dank für das Ausfüllen des Fragebogens!',
      continue: 'Weiter zur nächsten Aufgabe'
    }
  },
  // ========== WORKFLOW ==========
  workflow: {
    builder: {
      title: 'Forschungs-Workflow',
      addNode: 'Knoten hinzufügen',
      addNodes: 'Knoten hinzufügen',
      dragToAdd: 'Auf Canvas ziehen zum Hinzufügen', 
      nodeCategories: {
        input: 'EINGABE',
        processing: 'VERARBEITUNG',
        logic: 'LOGIK', 
        analysis: 'ANALYSE',
        ai: 'KI',
        output: 'AUSGABE'
      },
      nodes: {
        loadData: 'Daten laden',
        filterData: 'Daten filtern',
        cleanData: 'Daten bereinigen', 
        sortData: 'Daten sortieren',
        logicIf: 'Logik Wenn',
        combineData: 'Daten kombinieren',
        sentimentAnalysis: 'Sentiment-Analyse',
        generateInsights: 'Erkenntnisse generieren',
        showResults: 'Ergebnisse anzeigen'
      },
      nodeTypes: {
        dataInput: 'Dateneingabe',
        dataProcessing: 'Datenverarbeitung',
        conditional: 'Bedingung',
        analysis: 'Analyse', 
        aiOperation: 'KI-Operation',
        output: 'Ausgabe'
      },
      toolbar: {
        save: 'Speichern',
        clear: 'Leeren',
        settings: 'Einstellungen',
        execute: 'Ausführen'
      },
      status: {
        ready: 'Bereit zur Ausführung',
        emptyWorkflow: 'Leerer Workflow',
        missingInput: 'Eingabeknoten fehlt',
        missingOutput: 'Ausgabeknoten fehlt', 
        noConnections: 'Keine Verbindungen',
        incompleteWorkflow: 'Unvollständiger Workflow'
      },
      statusDetails: {
        addNodes: 'Füge Knoten hinzu, um deinen Workflow zu erstellen',
        addInput: 'Füge einen Dateneingabeknoten hinzu, um deinen Workflow zu starten',
        addOutput: 'Füge einen Ausgabeknoten hinzu, um deinen Workflow zu vervollständigen',
        connectNodes: 'Verbinde deine Knoten, um einen Workflow-Pfad zu erstellen',
        createPath: 'Erstelle einen Pfad von Eingabe- zu Ausgabeknoten',
        nodesConnected: '{{count}} Knoten ordnungsgemäß verbunden'
      },
      emptyState: {
        title: 'Beginne mit der Erstellung deines Workflows',
        description: 'Ziehe Knoten aus der Seitenleiste und lege sie ab, um deinen Forschungsautomatisierungs-Workflow zu erstellen.',
        addFirstNode: 'Deinen ersten Knoten hinzufügen'
      },
      connectionHelper: {
        connecting: 'Ziehen zum Verbinden von Knoten • Grün = Gültiges Ziel • Grau = Ungültig'
      },
      nodeEditor: {
        title: 'Knoten bearbeiten',
        label: 'Bezeichnung',
        description: 'Beschreibung',
        cancel: 'Abbrechen', 
        save: 'Speichern'
      }
    },
    sidebar: {
      dashboard: 'Dashboard',
      builder: 'Workflow-Builder',
      aichat: 'KI-Assistent',
      templates: 'Vorlagen',
      executions: 'Ausführungen',
      analytics: 'Analysen',
      tutorials: 'Anleitungen',
      settings: 'Einstellungen'
    },
    notifications: {
      nodeAdded: 'Knoten erfolgreich hinzugefügt',
      nodeDeleted: 'Knoten gelöscht',
      nodeSaved: 'Knoten gespeichert',
      connectionAdded: 'Verbindung erstellt',
      connectionDeleted: 'Verbindung entfernt',
      connectionFailed: 'Verbindung konnte nicht erstellt werden',
      validationFailed: 'Workflow-Validierung fehlgeschlagen',
      maxNodesReached: 'Maximale Anzahl von Knoten ({{max}}) erreicht',
      maxEdgesReached: 'Maximale Anzahl von Verbindungen ({{max}}) erreicht',
      sourceHandleMaxReached: 'Quell-Handle hat bereits maximal {{max}} Verbindung{{max === 1 ? "" : "en"}}',
      targetHandleMaxReached: 'Ziel-Handle hat bereits maximal {{max}} Verbindung{{max === 1 ? "" : "en"}}',
      workflowExecuted: 'Workflow mit {{nodes}} Knoten und {{connections}} Verbindungen ausgeführt',
      workflowSaved: 'Workflow gespeichert: {{nodes}} Knoten, {{connections}} Verbindungen',
      workflowCleared: 'Workflow gelöscht'
    }
  }
};