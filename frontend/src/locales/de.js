// frontend/src/locales/de.js
export const de = {
  common: {
    navigation: {
      previous: "Zurück",
      next: "Weiter"
    },
    form: {
      pleaseSelect: "Bitte auswählen..."
    },
    validation: {
      required: "Dieses Feld ist erforderlich"
    }
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
        gatherData: "Daten sammeln",
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
    welcome: {
      title: "Willkommen zur Agentic AI Studie",
      subtitle: "Forschung zur Gestaltung agentischer KI-Workflows",
      description: "Willkommen! Sie nehmen an einer Forschungsstudie teil, die untersucht, wie Menschen agentische KI-Workflows mit visuellen Tools entwerfen und damit interagieren.",
      whatYouWillDo: {
        title: "Was Sie tun werden:",
        explore: "Erkunden Sie unsere visuelle Workflow-Builder-Oberfläche",
        create: "Erstellen Sie KI-Agent-Workflows für verschiedene Szenarien",
        test: "Testen und iterieren Sie Ihre Workflow-Designs",
        complete: "Erledigen Sie Aufgaben und geben Sie Feedback"
      },
      studyDetails: {
        title: "Details der Studie:",
        duration: {
          label: "Dauer:",
          value: "30-60 Minuten (arbeiten Sie in Ihrem eigenen Tempo)"
        },
        privacy: {
          label: "Datenschutz:",
          value: "Anonym - keine persönlichen Daten werden erfasst"
        },
        data: {
          label: "Daten:",
          value: "Nur Interaktionsmuster und Workflow-Designs"
        },
        resumable: {
          label: "Fortsetzbar:",
          value: "Speichern Sie Ihren Fortschritt und setzen Sie später fort"
        }
      },
      beforeWeBegin: {
        title: "Bevor wir beginnen:",
        description: "Wir stellen Ihnen einige kurze Fragen zu Ihrem Hintergrund, um unsere Teilnehmer besser zu verstehen. Dies hilft uns zu analysieren, wie verschiedene Erfahrungsniveaus an die Gestaltung agentischer KI herangehen."
      }
    },
    basicInfo: {
      title: "Grundlegende Informationen",
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
      title: "Technischer Hintergrund",
      programming: {
        label: "Programmiererfahrung",
        none: "Keine Programmiererfahrung",
        beginner: "Anfänger (< 1 Jahr)",
        intermediate: "Fortgeschritten (1-3 Jahre)",
        advanced: "Erfahren (3-7 Jahre)",
        expert: "Experte (7+ Jahre)"
      },
      aiMl: {
        label: "KI/ML Erfahrung",
        none: "Keine KI/ML Erfahrung",
        beginner: "Anfänger - etwas Kontakt/Lernen",
        intermediate: "Fortgeschritten - einige KI/ML Projekte erstellt",
        advanced: "Erfahren - professionelle KI/ML Arbeit",
        expert: "Experte - KI/ML Spezialist/Forscher"
      },
      workflowTools: {
        label: "Verwendete Workflow-/Automatisierungstools (alle zutreffenden auswählen)",
        none: "Keines davon",
        other: "Anderes (bitte in Kommentaren angeben)"
      },
      technicalRole: {
        label: "Beschreibt am besten Ihre technische Rolle",
        developer: "Software-Entwickler/Ingenieur",
        dataScientist: "Data Scientist/Analyst",
        researcher: "Akademischer/Industrieller Forscher",
        productManager: "Produktmanager",
        designer: "UX/UI Designer",
        student: "Student",
        businessAnalyst: "Business-Analyst",
        consultant: "Berater",
        other: "Anderes",
        nonTechnical: "Nicht-technische Rolle"
      }
    },
    studyContext: {
      title: "Studienkontext",
      motivation: {
        label: "Was hat Sie motiviert, an dieser Studie teilzunehmen?",
        placeholder: "z.B. Interesse an KI, Forschungsteilnahme, Lernen über Workflow-Tools..."
      },
      expectations: {
        label: "Was hoffen Sie zu lernen oder zu erfahren?",
        placeholder: "Ihre Erwartungen an die Studie und den Workflow-Builder..."
      },
      timeAvailability: {
        label: "Wie viel Zeit haben Sie heute zur Verfügung?",
        short: "15-30 Minuten",
        medium: "30-45 Minuten",
        long: "45-60 Minuten",
        veryLong: "Mehr als 60 Minuten",
        flexible: "Flexibel - ich kann pausieren und später fortsetzen"
      }
    },
    optionalInfo: {
      title: "Optionale Informationen",
      country: {
        label: "Land/Region (optional)",
        placeholder: "z.B. Deutschland, Vereinigte Staaten, etc."
      },
      firstLanguage: {
        label: "Muttersprache (optional)",
        placeholder: "z.B. Deutsch, Englisch, Spanisch, etc."
      },
      comments: {
        label: "Zusätzliche Kommentare (optional)",
        placeholder: "Weitere Informationen, die Sie teilen möchten, oder Fragen zur Studie..."
      }
    },
    progress: {
      step: "Schritt {{current}} von {{total}}",
      complete: "abgeschlossen"
    },
    navigation: {
      readyToStart: "Bereit anzufangen?",
      continueWhenReady: "Fortfahren, wenn Sie bereit sind",
      almostDone: "Fast fertig!",
      submitting: "Wird übermittelt...",
      completeAndContinue: "Abschließen & Fortfahren",
      startQuestionnaire: "Fragebogen starten"
    },
    privacyNote: "Alle Antworten sind anonym und werden ausschließlich für Forschungszwecke verwendet. Sie können alle optionalen Fragen überspringen, die Sie nicht beantworten möchten."
  }
};