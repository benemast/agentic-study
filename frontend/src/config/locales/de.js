// frontend/src/config/locales/de.js
export const de = {
  // ========== COMMON ==========
  common: {
    form: {
      pleaseSelect: 'Bitte auswählen...',
      selectOption: 'Bitte auswählen...',
      required: 'Dieses Feld ist erforderlich',
      optional: '(optional)',
      yes: 'Ja',
      no: 'Nein'
    },
    
    validation: {
      required: 'Dieses Feld ist erforderlich',
      pleaseFillRequired: 'Bitte fülle alle erforderlichen Felder aus, bevor du fortfährst',
      invalidEmail: 'Bitte gib eine gültige E-Mail-Adresse ein',
      minNum: 'Muss mindestens {{min}} sein',
      maxNum: 'Darf maximal {{max}} sein',
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
  // ========== DATA VIEWER ==========
  dataViewer: {
    title: 'Datenansicht',
    reviewsCount: 'Bewertungen',
    openModal: 'Im Modal öffnen',
    updating: 'Wird aktualisiert...',
    noReviews: 'Es wurden keine Bewertungen gefunden.',
    viewMode: {
      cards: 'Kartenansicht',
      table: 'Tabellenansicht'
    },
    filters: {
      all: 'Alle',
      positive: 'Positiv',
      neutral: 'Neutral',
      negative: 'Negativ',
      allProducts: 'Alle Produkte'
    }
  },
  // ========== TUTORIAL ==========
  tutorial: {
    // Joyride locale (buttons)
    locale: {
      back: '← Zurück',
      close: 'Schließen',
      last: 'Verstanden! ✓',
      next: 'Weiter →',
      skip: 'Tutorial überspringen',
    },
    
    // Screen-level tutorial (Task 1 only)
    screen: {
      welcome: {
        title: '👋 Willkommen zum Aufgaben-Bildschirm!',
        description: 'Dieser Bildschirm enthält alles, was Sie zur Erledigung Ihrer Aufgabe benötigen. Lassen Sie mich Ihnen alles zeigen!',
      },
      taskDescription: {
        title: '📋 Aufgabenbeschreibung',
        description: 'Hier finden Sie Ihre Rolle, Ihr Ziel und welche Ausgabe erwartet wird. Klicken Sie auf den Pfeil, um diesen Abschnitt ein-/auszuklappen.',
      },
      datasetViewer: {
        title: '📊 Datensatz-Viewer',
        description: 'Dies ist Ihre Datenquelle - Kundenbewertungen, die Sie analysieren werden. Sie können hier durch alle verfügbaren Bewertungen scrollen.',
      },
      viewModes: {
        title: '🔄 Ansichtsmodi wechseln',
        description: 'Wechseln Sie zwischen Kartenansicht (einfacher zu lesen) und Tabellenansicht (kompakter). Wählen Sie, was am besten für Sie funktioniert!',
      },
      filterReviews: {
        title: '🔍 Bewertungen filtern',
        description: 'Filtern Sie Bewertungen nach Stimmung: Alle, Positiv (4-5 Sterne), Neutral (3 Sterne) oder Negativ (1-2 Sterne).',
      },
      popOutViwer:{
        title: '🔲 Viewer ausklappen',
        description: 'Klicken Sie auf diese Schaltfläche, um den Datensatz-Viewer in einem größeren Fenster zu öffnen. Perfekt, wenn Sie sich auf die Daten konzentrieren oder diese detaillierter betrachten möchten!',
      },
      resizePanels: {
        title: '↔️ Panels anpassen',
        description: 'Ziehen Sie diesen Griff nach links oder rechts, um die Panel-Größen anzupassen. Vergrößern Sie den Daten-Viewer oder geben Sie mehr Platz für Ihren Arbeitsbereich!',
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
        description: 'Erstelle deine Analyse, indem du Tools miteinander verbindest. Jedes Tool verarbeitet Daten und gibt sie an den nächsten Schritt weiter!',
      },
      
      // NEU: Sidebar-Bereich
      sidebar: {
        title: '📚 Tool-Bibliothek',
        description: 'Diese Seitenleiste enthält alle verfügbaren Tools. Die Tools sind nach ihrer Funktion in Kategorien organisiert:',
        input: 'Lade und importiere deine Daten',
        processing: 'Filtere, bereinige und transformiere Daten',
        analysis: 'Führe analytische Operationen durch',
        output: 'Zeige und exportiere Ergebnisse',
        finalRemark: 'Durchsuche verschiedene Knotentypen, um deinen Workflow zu erstellen.'
      },
            
      // NEU: Tooltip-Funktion
      tooltips: {
        title: '💬 Hover für Details',
        description: 'Jedes Tool hat einen hilfreichen Tooltip, der erscheint, wenn du darüber schwebst. Diese Tooltips erklären, was das Tool macht und wie man es benutzt.',
        tryText: 'Versuche, über "Bewertungen laden" zu schweben, um den Tooltip zu sehen!',
      },
      
      // Canvas
      canvas: {
        title: '🎨 Workflow-Canvas',
        description: 'Dies ist dein Arbeitsbereich, in dem du Workflows erstellst, indem du Tools ziehst und verbindest.',
        actionTitle: 'Tools hinzufügen',
        actionText: 'Ziehe ein Tool aus der Seitenleiste und lege es auf dem Canvas ab, um es zu deinem Workflow hinzuzufügen.',
      },
      
      // NEU: Toolbar-Bereich
      toolbar: {
        title: '🔧 Workflow-Toolbar',
        description: 'Die Toolbar oben bietet Workflow-Steuerungen und Status:',
        statusIndicator: 'Status-Anzeige',
        statusDescription: 'Zeigt an, ob dein Workflow ausführungsbereit ist (grün) oder Korrekturen benötigt (gelb)',
        saveButton: 'Speichern',
        saveDescription: 'Speichere deinen Workflow manuell (speichert auch automatisch)',
        clearButton: 'Leeren',
        clearDescription: 'Entferne alle Knoten und beginne von vorne',
        executeButton: 'Ausführen',
        executeDescription: 'Führe deinen Workflow aus (nur aktiviert, wenn der Workflow gültig ist)',
      },
      
      // NEU: Knoten-Einstellungen
      nodeSettings: {
        title: '⚙️ Konfiguriere deine Tools',
        description: 'Jedes Tool kann mit spezifischen Einstellungen konfiguriert werden. Diese Einstellungen erscheinen direkt auf dem Knoten.',
        displayTitle: 'Einstellungs-Anzeige',
        displayText: 'Konfigurierte Einstellungen werden in einer blauen Box auf jedem Knoten angezeigt, sodass du deine Auswahl auf einen Blick sehen kannst.',
        editTitle: 'Einstellungen bearbeiten',
        editText: 'Klicke auf das blaue Stift-Symbol auf einem Knoten, um den Konfigurationsdialog zu öffnen.',
      },
      
      // Verbindungen
      connections: {
        title: '🔗 Verbinde deine Tools',
        description: 'Verbinde Tools, um den Datenfluss durch deinen Workflow zu definieren:',
        topHandle: 'Oberer Griff (▲) empfängt Eingabe von vorherigen Tools',
        bottomHandle: 'Unterer Griff (▼) sendet Ausgabe an nächste Tools',
        dragConnect: 'Klicke und ziehe von einem Griff zum anderen, um eine Verbindung zu erstellen',
        validTitle: 'Gültige Verbindungen',
        validText: 'Grüne Hervorhebungen zeigen gültige Verbindungsziele an. Ungültige Ziele werden nicht hervorgehoben.',
      },
      
      // NEU: Visuelles Feedback
      visualFeedback: {
        title: '🎨 Visuelle Verbindungsindikatoren',
        description: 'Griff-Farben zeigen den Verbindungsstatus:',
        greenValid: 'Grün - Gültiges Verbindungsziel (beim Verbinden)',
        grayUnconnected: 'Grau - Nicht verbunden',
        blueConnected: 'Blau - Bereits verbunden',
      },
      
      // Ausführen
      execute: {
        title: '▶️ Führe deinen Workflow aus',
        description: 'Sobald dein Workflow vollständig ist, klicke auf Ausführen, um ihn zu starten und Ergebnisse zu sehen.',
        requirementsTitle: 'Anforderungen',
        requirementsText: 'Dein Workflow benötigt mindestens einen Eingabeknoten, einen Ausgabeknoten und einen gültigen Pfad, der sie verbindet.',
      },
      
      // Tipps
      tips: {
        title: '💡 Tipps für den Erfolg',
        startSimple: 'Beginne einfach: Bewertungen laden → Ergebnisse anzeigen ist ein gültiger Workflow!',
        useTooltips: 'Verwende Tooltips: Fahre über Tools, um zu lernen, was sie tun',
        checkSettings: 'Konfiguriere Einstellungen: Jedes Tool zeigt seine Einstellungen auf dem Knoten',
        validateBefore: 'Überprüfe den Status: Stelle sicher, dass die Toolbar "Bereit" anzeigt, bevor du ausführst',
        autoSave: 'Auto-Speicherung: Dein Fortschritt wird automatisch gespeichert, während du arbeitest',
      },
    },
    
    // AI Assistant tutorial
    aiAssistant: {
      welcome: {
        title: '🤖 KI-Assistent',
        description: 'Chatten Sie mit der KI, um Ihre Daten zu analysieren. Die KI wird autonom Aufgaben ausführen und Tools verwenden, um Ihnen zu helfen!',
      },
      chatInterface: {
        title: '💬 Chat-Interface',
        description: 'Beschreiben Sie, was Sie analysieren möchten, oder stellen Sie Fragen zu den Daten. Seien Sie spezifisch für beste Ergebnisse!',
        example: 'Beispiel: "Finde die Top 3 negativen Themen" oder "Analysiere die Stimmungsverteilung"',
      },
      aiTakesAction: {
        title: '🔄 KI handelt',
        description: 'Die KI wird automatisch die richtigen Tools verwenden und Daten verarbeiten, um Ihre Fragen zu beantworten. Sie sehen im Chat, was sie tut.',
      },
      reviewResults: {
        title: '🔍 Ergebnisse überprüfen',
        description: 'Die KI zeigt Ihnen Analyseergebnisse, Erkenntnisse und Daten. Sie können Folgefragen stellen, um tiefer zu graben!',
      },
      iterateRefine: {
        title: '🔁 Iterieren & Verfeinern',
        description: 'Chatten Sie weiter, um Ihre Analyse zu verfeinern. Fragen Sie nach mehr Details, verschiedenen Perspektiven oder zusätzlichen Erkenntnissen.',
      },
      tipsForSuccess: {
        title: '💡 Tipps für den Erfolg',
        tip1: 'Seien Sie spezifisch, was Sie wollen',
        tip2: 'Stellen Sie jeweils eine Frage',
        tip3: 'Überprüfen Sie die Arbeit der KI und geben Sie Feedback',
        tip4: 'Iterieren Sie, bis Sie haben, was Sie brauchen',
      },
    },
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
        // Data Tools
        loadReviews: {
          label: 'Bewertungen Laden',
          type: 'Dateneingabe',
          description: 'Produktbewertungen aus der Datenbank laden. Dies ist Ihr Ausgangspunkt - wählen Sie Bewertungen nach Kategorie, Bewertung oder verifiziertem Kaufstatus aus.',
          config: {
            category: {
              label: 'Produktkategorie',
              help: 'Wählen Sie, aus welcher Produktkategorie Bewertungen geladen werden sollen',
              placeholder: 'Kategorie wählen',
              options: {
                shoes: 'Schuhe',
                wireless: 'Kabellose Kopfhörer'
              }
            },
            limit: {
              label: 'Maximale Bewertungen',
              help: 'Begrenzen Sie die Anzahl der zu ladenden Bewertungen (leer lassen für alle)',
              placeholder: 'Keine Begrenzung'
            }
          }
        },
        
        filterReviews: {
          label: 'Bewertungen Filtern',
          type: 'Datenverarbeitung',
          description: 'Bewertungen nach bestimmten Kriterien wie Bewertungsbereich, verifizierten Käufen oder Schlüsselwörtern filtern. Grenzt Ihren Datensatz auf relevante Einträge ein.',
          config: {
            field: {
              label: 'Filterspalte',
              help: 'Wählen Sie, nach welcher Spalte gefiltert werden soll',
              placeholder: 'Spalte wählen'
            },
            operator: {
              label: 'Filterbedingung',
              help: 'Wählen Sie, wie die Werte verglichen werden sollen',
              placeholder: 'Bedingung wählen'
            },
            value: {
              label: 'Filterwert',
              help: 'Geben Sie den Wert zum Filtern ein',
              placeholder: 'Wert eingeben'
            }
          }
        },
        
        sortReviews: {
          label: 'Bewertungen Sortieren',
          type: 'Datenverarbeitung',
          description: 'Bewertungen in einer bestimmten Reihenfolge nach Bewertung, Nützlichkeit, Engagement oder anderen Feldern anordnen. Hilft, Daten für eine bessere Analyse zu organisieren.',
          config: {
            sortBy: {
              label: 'Sortieren Nach',
              help: 'Wählen Sie, nach welcher Spalte sortiert werden soll',
              placeholder: 'Spalte wählen'
            },
            descending: {
              label: 'Sortierrichtung',
              help: 'Sortierrichtung wählen',
              options: {
                true: 'Absteigend (Hoch zu Niedrig)',
                false: 'Aufsteigend (Niedrig zu Hoch)'
              }
            }
          }
        },
        
        cleanData: {
          label: 'Bewertungen Bereinigen',
          type: 'Datenverarbeitung',
          description: 'Erkennt und entfernt Spam-, fehlerhafte oder Bewertungen mit fehlenden Datenfeldern automatisch. Verbessert die Datenqualität vor der Analyse.',
          config: {
            removeNulls: {
              label: 'Nullwerte Entfernen',
              help: 'Datensätze mit Null-/Leerwerten in Schlüsselfeldern entfernen',
              placeholder: 'Aktivieren, um Nullwerte zu entfernen'
            },
            normalizeText: {
              label: 'Text Normalisieren',
              help: 'Textformatierung standardisieren und Sonderzeichen entfernen',
              placeholder: 'Aktivieren, um Text zu normalisieren'
            },
            removeDuplicates: {
              label: 'Duplikate Entfernen',
              help: 'Doppelte Bewertungen basierend auf Bewertungs-ID entfernen',
              placeholder: 'Aktivieren, um Duplikate zu entfernen'
            }
          }
        },

        // Analysis Tools
        reviewSentimentAnalysis: {
          label: 'Sentiment-Analyse',
          type: 'KI gestützte Analyse',
          description: 'Schlüsselthemen und Sentiment-Muster aus Kundenbewertungen extrahieren. Identifiziert, was Kunden am meisten diskutieren und wie sie über bestimmte Produktaspekte denken.',
          config: {
            extractThemes: {
              label: 'Schlüsselthemen Extrahieren',
              help: 'Wiederkehrende Themen identifizieren, die Kunden diskutieren (z.B. Komfort, Haltbarkeit, Preis)',
              placeholder: 'Themenextraktion aktivieren'
            },
            themeSeparation: {
              label: 'Themenorganisation',
              help: 'Wie sollen Themen kategorisiert werden?',
              options: {
                combined: 'Alle Themen Zusammen',
                bySentiment: 'Positive/Negative Themen Trennen'
              }
            },
            maxThemesPerCategory: {
              label: 'Anzahl der Themen',
              help: 'Wie viele Themen pro Kategorie extrahieren'
            },
            includePercentages: {
              label: 'Themenprozentsätze Einschließen',
              help: 'Häufigkeitsprozentsatz für jedes Thema berechnen',
              placeholder: 'Aktivieren, um Prozentsätze anzuzeigen'
            }
          }
        },
        
        generateInsights: {
          label: 'Erkenntnisse Generieren',
          type: 'KI gestützte Analyse',
          description: 'Umsetzbare Geschäftsempfehlungen basierend auf Kundenfeedback-Analyse generieren. Übersetzt Muster in strategische nächste Schritte.',
          config: {
            focusArea: {
              label: 'Empfehlungsfokus',
              help: 'Welche Art von Empfehlungen priorisieren',
              options: {
                competitivePositioning: {
                  label: 'Wettbewerbspositionierung',
                  help: 'Vergleichen Sie Ihr Produkt mit Wettbewerbern und identifizieren Sie Marktchancen'
                },
                customerExperience: {
                  label: 'Kundenerfahrung',
                  help: 'Kundenzufriedenheit verbessern und Problempunkte angehen'
                },
                marketingMessages: {
                  label: 'Marketingbotschaften',
                  help: 'Effektive Botschaften basierend auf Kundensprache und Prioritäten erstellen'
                },
                productImprovements: {
                  label: 'Produktverbesserungen',
                  help: 'Spezifische Funktionen oder Qualitätsverbesserungen identifizieren, die Kunden wünschen'
                }
              }
            },
            maxRecommendations: {
              label: 'Anzahl der Empfehlungen',
              help: 'Maximale Anzahl zu generierender Empfehlungen'
            }
          }
        },
        
        // Output Tool
        showResults: {
          label: 'Ergebnisse Anzeigen',
          type: 'Ausgabe',
          description: 'Die endgültige Ausgabe Ihres Workflows anzeigen. Dies ist Ihr Endpunkt - es präsentiert die verarbeiteten Daten, Analyseergebnisse und Erkenntnisse.',
          note: 'Nur Daten, die von vorherigen Tools verfügbar sind, werden angezeigt. Nicht verfügbare Abschnitte werden markiert.',
          config: {
            includeSections: {
              label: 'Berichtsabschnitte',
              help: 'Wählen Sie Abschnitte aus, die in Ihrem Bericht enthalten sein sollen',
              options: {
                executiveSummary: {
                  label: 'Zusammenfassung',
                  help: 'Überblick über Ergebnisse und wichtige Erkenntnisse'
                },
                themes: {
                  label: 'Schlüsselthemen',
                  help: 'Extrahierte Themen mit Häufigkeiten und Sentiment-Analyse'
                },
                recommendations: {
                  label: 'Empfehlungen',
                  help: 'Umsetzbare Geschäftsempfehlungen basierend auf Analyse'
                },
                statistics: {
                  label: 'Statistiken & Metriken',
                  help: 'Quantitative Daten und Verteilungsmetriken'
                },
                dataPreview: {
                  label: 'Datenvorschau',
                  help: 'Stichprobe von Roh-Bewertungsdaten, die in der Analyse verwendet wurden'
                }
              }
            },
            statisticsMetrics: {
              label: 'Anzuzeigende Statistiken',
              help: 'Wählen Sie, welche Statistiken eingeschlossen werden sollen (nur angezeigt, wenn Statistikabschnitt aktiviert ist)',
              options: {
                sentimentDistribution: {
                  label: 'Gesamtsentiment-Verteilung',
                  help: 'Prozentuale Aufschlüsselung positiver, neutraler und negativer Bewertungen'
                },
                reviewSummary: {
                  label: 'Gesamtbewertungen & Durchschnitt',
                  help: 'Gesamtzahl der analysierten Bewertungen und Durchschnittsbewertung'
                },
                ratingDistribution: {
                  label: 'Bewertungsverteilung',
                  help: 'Anzahl und Prozentsatz der Bewertungen nach Bewertung (1-5 Sterne)'
                },
                verifiedRate: {
                  label: 'Verifizierte Kaufrate',
                  help: 'Prozentsatz der Bewertungen von verifizierten Käufen vs. nicht verifiziert'
                },
                themeCoverage: {
                  label: 'Themenabdeckung',
                  help: 'Prozentsatz der Bewertungen, die identifizierte Themen erwähnen'
                },
                sentimentConsistency: {
                  label: 'Sentiment-Konsistenz',
                  help: 'Korrelation zwischen Sternebewertungen und Sentiment-Klassifizierung'
                }
              }
            },
            showVisualizations: {
              label: 'Visualisierungen Einschließen',
              help: 'Diagramme und Grafiken anzeigen, wo anwendbar',
              placeholder: 'Aktivieren, um Diagramme anzuzeigen'
            },
            maxDataItems: {
              label: 'Maximale Elemente in Datenvorschau',
              help: 'Anzahl der in der Datenvorschau-Tabelle angezeigten Elemente begrenzen'
            }
          }
        },        
        // Logic Tools
        logicIf: {
          label: 'Logik Wenn',
          type: 'Bedingung',
          description: 'Teilt den Workflow basierend auf einer Bedingung. Leitet Daten zu verschiedenen Pfaden, je nachdem, ob die Bedingung wahr oder falsch ist.'
        },
        combineData: {
          label: 'Daten kombinieren',
          type: 'Datenverarbeitung',
          description: 'Daten aus mehreren Workflow-Zweigen zusammenführen. Bringt Ergebnisse aus verschiedenen Verarbeitungspfaden zusammen.'
        },
        
        settings: {
          // General
          notConfigured: 'Nicht konfiguriert',
          
          // Sentiment Analysis Node
          sentiment: {
            extractThemes: 'Themen extrahieren',
            separatedBySentiment: 'Nach Sentiment getrennt',
            maxThemes: '{{count}} Thema/Themen',
            withPercentages: 'Mit Prozentsätzen'
          },
          
          // Generate Insights Node
          insights: {
            competitive_positioning: 'Wettbewerbspositionierung',
            customer_experience: 'Kundenerfahrung',
            marketing_messages: 'Marketingbotschaften',
            product_improvements: 'Produktverbesserungen',
            withMax: '{{areas}} (max {{max}})'
          },
          
          // Show Results Node
          results: {
            sections: {
              executive_summary: 'Zusammenfassung',
              themes: 'Themen',
              recommendations: 'Empfehlungen',
              statistics: 'Statistiken',
              data_preview: 'Daten'
            },
            withStats: '{{count}} Statistik(en)',
            withCharts: 'Mit Diagrammen',
            maxItems: 'Max {{max}} Elemente'
          },
          
          // Filter node (existing, keep as-is)
          filter: 'Filtern nach {{column}} {{operator}} {{value}}',
          
          // Sort node (existing, keep as-is)
          sort: 'Sortieren nach {{column}} ({{direction}})',
          ascending: {
            full: 'aufsteigend',
            short: '↑ Auf'
          },
          descending: {
            full: 'absteigend',
            short: '↓ Ab'
          },
          
          // Clean node (existing, keep as-is)
          clean: {
            label: 'Bereinigen: {{actions}}',
            removeNulls: 'Nullwerte entfernen',
            removeDuplicates: 'Duplikate entfernen',
            normalizeText: 'Text normalisieren'
          },
          
          // Load node (existing, keep as-is)
          load: {
            wireless: 'Kabellos',
            shoes: 'Schuhe',
            withLimit: '{{category}} laden (max {{limit}})',
            noLimit: '{{category}} laden'
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
              equals: 'Gleich',
              not_equals: 'Nicht Gleich',
              contains: 'Enthält',
              not_contains: 'Enthält Nicht',
              starts_with: 'Beginnt Mit',
              ends_with: 'Endet Mit',
              greater: 'Größer Als',
              greater_or_equal: 'Größer oder Gleich',
              less: 'Kleiner Als',
              less_or_equal: 'Kleiner oder Gleich',
              is: 'Ist'
            }
          }
        }
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
        incompleteWorkflow: 'Unvollständiger Workflow',
        configurationIncomplete: 'Konfiguration unvollständig'
      },
      statusDetails: {
        addNodes: 'Füge Knoten hinzu, um deinen Workflow zu erstellen',
        addInput: 'Füge einen Dateneingabeknoten hinzu, um deinen Workflow zu starten',
        addOutput: 'Füge einen Ausgabeknoten hinzu, um deinen Workflow zu vervollständigen',
        connectNodes: 'Verbinde deine Knoten, um einen Workflow-Pfad zu erstellen',
        createPath: 'Erstelle einen Pfad von Eingabe- zu Ausgabeknoten',
        nodesConnected: '{{count}} Knoten ordnungsgemäß verbunden',
        configureNodes: 'Konfigurieren Sie alle erforderlichen Felder'
      },
      emptyState: {
        title: 'Beginne mit der Erstellung deines Workflows',
        description: 'Ziehe Knoten aus der Seitenleiste und lege sie ab, um deinen Automatisierungs-Workflow zu erstellen.',
        addFirstNode: 'Ersten Knoten hinzufügen'
      },
      connectionHelper: {
        connecting: 'Ziehen zum Verbinden von Knoten • Grün = Gültiges Ziel • Grau = Ungültig'
      },
      nodeEditor: {
        title: 'Knoten Bearbeiten',
        label: 'Bezeichnung',
        description: 'Beschreibung',
        cancel: 'Abbrechen',
        save: 'Speichern',
        options: 'Optionen',
        fields: 'Felder',
        noConfig: 'Keine Konfigurationsoptionen verfügbar',
        fixErrors: 'Bitte {{count}} Fehler beheben'
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
      workflowCleared: 'Workflow gelöscht',
      executionFailed: 'Workflow-Ausführung fehlgeschlagen',
      executionStarted: 'Workflow-Ausführung gestartet',
      executionCompleted: 'Workflow-Ausführung abgeschlossen',
      executionCancelled: 'Workflow-Ausführung abgebrochen',
      validationFailed: 'Workflow-Validierung fehlgeschlagen',
      
      // More detailed versions (optional)
      executionFailedWithError: 'Workflow-Ausführung fehlgeschlagen: {{error}}',
      validationFailedWithErrors: 'Workflow-Validierung fehlgeschlagen: {{errors}}'
    }
  }
};