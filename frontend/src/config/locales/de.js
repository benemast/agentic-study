// frontend/src/config/locales/de.js
export const de = {
  // ========== COMMON ==========
  common: {
    form: {
      pleaseSelect: 'Bitte auswählen…',
      selectOption: 'Bitte auswählen…',
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
      init: 'Initialisiere Studie…'
    }    
  },
  // ========== FOOTER ==========
  footer: {
    legalNote: {
      label: 'Impressum',
      url: 'https://www.tu-darmstadt.de/impressum/index.de.jsp'
    },
    note:'Die Studie dauert ca. 30 Minuten. Dein Fortschritt wird automatisch gespeichert.',
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
        time: '30 Minuten',
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
      researchPurpose: 'Die Daten werden von den Forschenden ausschließlich für nicht-kommerzielle Forschungszwecke verwendet und nicht an Dritte weitergegeben oder in andere Länder als Deutschland übertragen. Die ausgewerteten Forschungsergebnisse werden in aggregierter Form in einem wissenschaftlichen Beitrag veröffentlicht.',
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
        researchPurpose: 'Die Daten werden von den Forschenden ausschließlich für nicht-kommerzielle Forschungszwecke verwendet und nicht an Dritte weitergegeben oder in andere Länder als Deutschland übertragen. Die ausgewerteten Forschungsergebnisse werden in aggregierter Form in einem wissenschaftlichen Beitrag veröffentlicht.'
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
      description: 'Überblick über deinen beruflichen Hintergrund',
      occupation: {
        label: 'Derzeitige Tätigkeit / Bereich (optional)',
        placeholder: 'z.B. Software-Ingenieur*in, Student*in, Forscher*in, etc.'
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
      
      programmingExperience: {
        label: 'Programmiererfahrung',
        none: 'Keine Programmiererfahrung',
        beginner: '< 1 Jahr Erfahrung',
        intermediate: '1-3 Jahre Erfahrung',
        advanced: '3-7 Jahre Erfahrung',
        expert: '7+ Jahre Erfahrung'
      },
      
      aiMlExperience: {
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
          expert: 'Experte - KI/ML-Spezialist/Forscher*in'
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
        placeholder: 'Weitere Informationen, die du teilen möchten, oder Fragen zur Studie…'
      }
    },

    optionalInfo: {
      title: 'Optionale Informationen',
      comments: {
        label: 'Zusätzliche Kommentare (optional)',
        placeholder: 'Weitere Informationen, die du teilen möchtest, oder Fragen zur Studie…'
      }
    }
  },
  // ========== BRIEFING ==========
  briefing:{
    title: "Willkommen, Analyst*in!",
    mainContent: {
      intro: {
        first: "In dieser Studie schlüpfst du in die Rolle einer",
        strong: "Produktanalyst*in bei Amerzone",
        final: ", einer führenden E-Commerce-Plattform, die dafür bekannt ist, Millionen von Kunden mit allem zu verbinden, von stilvollen Schuhen bis hin zu den neuesten technischen Geräten."
      },
      toolBox: {
        first: "Das Product Insights-Team von Amerzone testet derzeit ",
        strong: "zwei neue Tools",
        final: " die Analyst*innen dabei helfen sollen, Kundenfeedback in klare, umsetzbare Erkenntnisse umzuwandeln:",
        workflow: {
          strong: "Der Workflow Builder",
          text: ", mit dem du deine eigenen Analyseprozess strukturieren und steuern kannst."
        },
        assistant: {
          strong: "Der AI-Chat-Assistent",
          text: ", ein Gesprächspartner, der dich begleitet und unterstüzt."
        }
      },
      mission: {
        first: "Deine Aufgabe ist es, echte Kundenbewertungen für ",
        strong: "zwei Produkte",
        final: " zu analysieren — eines aus der Kategorie kabellose Kopfhörer und eines aus der Kategorie Schuhe – und für jedes Produkt eine kurze Zusammenfassung der Erkenntnisse zu erstellen."
      },
      counterBalance: "Die Reihenfolge, in der du mit den Tools und Produkten arbeitest, variiert, aber am Ende wirst du beide Systeme und beide Aufgaben kennengelernt haben.",
      colaboration: {
        first: "Amerzone interessiert sich besonders dafür, wie Analysten mit KI-Tools zusammenarbeiten, die ",
        strong: "unterschiedliche Autonomiestufen",
        final: " aufweisen – von solchen, die deinen Anweisungen Schritt für Schritt folgen, bis hin zu solchen, die eher wie proaktive Teamkollegen agieren.",
        feedback: "Dein Feedback und deine Interaktion werden dazu beitragen, zu entscheiden, wie die Produktanalyseplattform der nächsten Generation des Unternehmens gestaltet werden soll.“"
      },
      tutorial: {
        first: "Bevor du dich deinen Aufgaben widmest, absolvierst du zunächst ein kurzes  ",
        strong: "Tutorial",
        final: " das dir die Plattform vorstellt und dich durch die wichtigsten Funktionen führt. Sobald du mit der Benutzeroberfläche vertraut bist, fahren du mit der ersten Analyseaufgabe fort."
      },
    },
    close: "Mach es dir bequem, öffnen dein Analyst*innen-Dashboard und mach dich bereit, Amerzone dabei zu helfen, Kundenstimmen in Strategien umzusetzen",
    ready: "Bereit zum Start"
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
    completeButton: 'Aufgabe abschließen',
    viewSummaryFirst: 'Bitte führe die Aufgabe aus und sieh dir die Zusammenfassung an, bevor du weitermachst',
    executeFirst: 'Bitte führe den Workflow/Chat aus, um Ergebnisse zu generieren'
  },
  
  description: {
    title: 'Aufgabenbeschreibung',
    collapse: 'Einklappen',
    expand: 'Ausklappen',
    role: 'Deine Rolle: Produkt Analyst*in',
    goal: 'Erstelle ein Informationsbriefing zu Kundenfeedback.',
    focusLabel: 'Fokus: ',
    focusText: {
      wireless: "Das Elektronik-Merchandising-Team von Amerzone überprüft derzeit die Lieferantenauswahl für das nächste Quartal und möchte entscheiden, ob die Mpow Cheetah-Kopfhörer weiterhin angeboten werden sollen. Das Team stützt sich auf deine Analyse, um zu verstehen, was Kunden am meisten schätzen, welche Probleme häufig auftreten und ob dieses Produkt weiterhin einen Platz im Wireless-Katalog von Amerzone verdient",
      shoes: 'Das Saisonkampagnen-Team von Amerzone plant eine neue Regenbekleidungsaktion und möchte authentische Kundenerfahrungen präsentieren. Es verlässt sich auf deine Analyse der Bewertungen zu den Kamik Jennifer Rain Boots, um herauszufinden, was Kunden am meisten schätzen, welche Bedenken sie äußern und welche Themen die Botschaften und Bilder der Kampagne inspirieren könnten.',
    },
    expectedOutputLabel: 'Erwartete Ergebnisse:',
    expectedOutput1: 'Management-Zusammenfassung der Kundenstimmung',
    expectedOutput2: 'Die 3 wichtigsten positiven Themen mit Prozentangaben',
    expectedOutput3: 'Die 3 wichtigsten negativen Themen mit Prozentangaben',
    expectedOutput4: '3–5 umsetzbare Empfehlungen',    
    productCard:{
      title: 'Zu analysierendes Produkt:',
      titleLable: 'Name:',
      categoryLabel: 'Kategorie:',
      wireless: 'Kopfhörer / Wireless',
      shoes: 'Schuhe'
    }
  },
  previousSummary: {
    title: "Zusammenfassung verfügbar",
    savedOn: "Gespeichert am",
    at: "um",
    unknownTime: "Unbekannte Zeit",
    viewButton: "Zusammenfassung anzeigen"
  },
  completion: {
    title: 'Aufgabe abschließen',
    message: 'Bist du zufrieden, dass die Ergebnisse den Aufgabenanforderungen entsprechen?',
    confirm: 'Ja, Aufgabe abschließen',
    cancel: 'Abbrechen'
  }
},
  // ========== DATA VIEWER ==========
  dataViewer: {
    title: 'Datenansicht',
    reviewsCount: 'Bewertungen',
    openModal: 'Im Modal öffnen',
    updating: 'Wird aktualisiert…',
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
        description: 'Dieser Bildschirm enthält alles, was du zur Erledigung deiner Aufgabe benötigen. Lassen mich dir alles zeigen!',
      },
      taskDescription: {
        title: '📋 Aufgabenbeschreibung',
        description: 'Hier finden du deine Rolle, dein Ziel und welche Ausgabe erwartet wird. Klicke auf den Pfeil, um diesen Abschnitt ein-/auszuklappen.',
      },
      datasetViewer: {
        title: '📊 Datensatz-Viewer',
        description: 'Dies ist deine Datenquelle - Kundenbewertungen, die du analysieren wirst. Du kannst hier durch alle verfügbaren Bewertungen scrollen.',
      },
      viewModes: {
        title: '📑 Ansichtsmodi wechseln',
        description: 'Wechsel zwischen Kartenansicht (einfacher zu lesen) und Tabellenansicht (kompakter). Wähle, was am besten für dich funktioniert!',
      },
      filterReviews: {
        title: '🔍 Bewertungen filtern',
        description: 'Filtere Bewertungen nach Stimmung: Alle, Positiv (4-5 Sterne), Neutral (3 Sterne) oder Negativ (1-2 Sterne).',
      },
      popOutViwer:{
        title: '🔲 Viewer ausklappen',
        description: 'Klicken auf diese Schaltfläche, um den Datensatz-Viewer in einem größeren Fenster zu öffnen. Perfekt, wenn du dich auf die Daten konzentrieren oder diese detaillierter betrachten möchten!',
        devNote: 'Entwicklerhinweis:',
        devNoteText: 'Wenn der Daten-Viewer kleiner als erwartet angezeigt wird, handelt es sich lediglich um einen Darstellungsfehler, der bei einigen Browsern oder Bildschirmgrößen auftreten kann. Wechsle einfach einmal zwischen Karten- und Tabellenansicht, um das Problem zu beheben'
      },
      resizePanels: {
        title: '↔️ Panels anpassen',
        description: 'Ziehe diesen Griff nach links oder rechts, um die Panel-Größen anzupassen. Vergrößere den Daten-Viewer oder gib dir mehr Platz für deinen Arbeitsbereich!',
      },
      tutorialButtons: {
        title: '📚 Tutorials neu starten',
        description: 'Solltest du später eine Auffrischung benötigen, kannst du dieses Tutorial jederzeit neu starten. Die Schaltfläche auf der linken Seite zeigt die Funktionen dieser Seite im Überblick, während die Schaltfläche auf der rechten Seite eine Auffrischung der aufgabenspezifischen Elemente bietet!',
      },
      completeTaskButton: {
        title: '✔️ Aufgabe abschließen',
        description: 'Nachdem du dir den neusten Berictht angesehen hast und mit den Ergebnissen zufrieden bist kannst du die Aufgabe abschließen.',
      },
      final:{
        title: "🎉 Puh, geschafft!",
        description: "Das war eine ganze Menge, aber jetzt bist du startklar. Vielen Dank fürs Durchhalten! 🙌"
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
        whatHappensTitle: "What’s Next",
        whatHappensBody: "Der Ausführungsstatus jedes Knotens wird durch ein Symbol auf der linken Seite angezeigt: ✅ Erfolgreich, 🔄 Wird verarbeitet oder ❌ Fehlgeschlagen. Klicke auf ein Symbol, um weitere Details anzuzeigen.",
        viewResultsTitle: "Ergebnisse ansehen",
        viewResultsText: "Klicke auf das Symbol für „Erfolgreich“ am Knoten „Ergebnisse anzeigen“, um die von deinem Workflow generierte Zusammenfassung anzuzeigen. Dadurch wird die Aufgabe zur Fertigstellung freigegeben. Du entscheidest, wann du mit den Ergebnissen zufrieden bist.",
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
        description: 'Chatte mit der Assistent, um deine Daten zu analysieren. Die Assistent wird autonom Aufgaben ausführen und Tools verwenden, um dir zu helfen!',
      },
      chatInterface: {
        title: '💬 Chat-Interface',
        description: 'Beschreibe, was du analysieren möchtest, oder stelle Fragen. Seien spezifisch für beste Ergebnisse!',
        example: 'Beispiel: "Analysiere die Stimmungsverteilung für Produkt ID XYZ"', 
        devNote: "Developer Note:",
        devNoteText: "The base dataset is pretty large, so the AI only has a very limited understanding of the specific data you’re using."
      },
      aiTakesAction: {
        title: '🤖 Assistent handelt',
        description: 'Die Assistent wird automatisch die richtigen Tools verwenden und Daten verarbeiten, um deine Fragen zu beantworten. Du siehst im Chat, was sie tut.',
      },
      reviewResults: {
        title: '🔍 Ergebnisse überprüfen',
        description: 'Die Assistent zeigt deine Analyseergebnisse, Erkenntnisse und Daten an.',
      },
      iterateRefine: {
        title: '🔁 Iterieren & Verfeinern',
        description: 'Chatte weiter, um deine Analyse zu verfeinern bis du mit dem Ergebnis zufrieden bist.',
      },
      clearChat: {
        title: '🗑️ Chat Löschen',
        description: 'Wenn der Assistent einmal vom Kurs abkommt oder nicht das tut, was du erwartest, kannst du einfach den Chat löschen und eine neue Konversation beginnen.',
      },
      tipsForSuccess: {
        title: '💡 Tipps für den Erfolg',
        tip1: 'Sei spezifisch, in der Beschreibung was du willst',
        tip2: 'Stelle jeweils eine Frage',
        tip3: 'Überprüfen die Arbeit der Assistent',
        tip4: 'Iteriere, bis du hast, was du brauchst',
      },
    },
  },
  // ========== SURVEY ==========
  survey: {
    // Haupt-Survey-Labels
    title: 'Fragebogen nach Aufgabe {{number}}',
    description: 'Bitte bewerten deine Erfahrung mit {{condition}}',
    conditionWorkflow: 'dem Workflow-Builder',
    conditionAI: 'dem KI-Assistenten',
    submit: 'Fragebogen absenden',
    submitting: 'Wird gesendet…',
    allQuestionsRequired: 'Bitte beantworte alle Fragen, bevor du fortfährst.',

    // Fortschrittsindikatoren
    progress: {
      section: 'Abschnitt',
      question: 'Frage',
      of: 'von',
      complete: 'abgeschlossen'
    },

    // Abschnittstitel und Beschreibungen
    sections: {
      cognitiveWorkload: 'Bewertung der kognitiven Arbeitsbelastung',
      cognitiveWorkloadDesc: 'Bitte bewerte den mentalen Aufwand für die Aufgabe.',
      controlEngagement: 'Kontrolle, Handlungsfähigkeit & Engagement',
      controlEngagementDesc: 'Bitte bewerten deine Erfahrung mit Kontrolle und Engagement.',
      understanding: 'Verständnis & Erklärbarkeit',
      understandingDesc: 'Bitte bewerte, wie gut du verstanden hast, was das System tat.',
      performance: 'Aufgabenleistung & Ergebnisse',
      performanceDesc: 'Bitte bewerte, wie gut das System deine Arbeit unterstützt hat.',
      feedback: 'Zusätzliches Feedback',
      feedbackDesc: 'Teile uns gerne weitere Gedanken mit (optional).'
    },

    // NASA-TLX (5 Dimensionen)
    nasaTlx: {
      // Dimension 1: Geistige Anforderung
      mentalDemand: 'Geistige Anforderung',
      mentalDemandDesc: 'Wie anspruchsvoll war die Aufgabe geistig?',

      // Dimension 2: Zeitliche Anforderung
      temporalDemand: 'Zeitliche Anforderung',
      temporalDemandDesc: 'Wie gehetzt oder überstürzt war das Tempo der Aufgabe?',

      // Dimension 3: Leistung
      performance: 'Leistung',
      performanceDesc: 'Wie erfolgreich warst du bei der Erfüllung dessen, was du tun sollten?',

      // Dimension 4: Anstrengung
      effort: 'Anstrengung',
      effortDesc: 'Wie hart musstest du arbeiten, um dein Ziel zu erreichen?',

      // Dimension 5: Frustration
      frustration: 'Frustration',
      frustrationDesc: 'Wie unsicher, entmutigt, gereizt, gestresst und verärgert warst du?',

      // Skalenbeschriftungen
      veryLow: 'Sehr niedrig',
      veryHigh: 'Sehr hoch',
      perfect: 'Perfekt',
      failure: 'Fehlgeschlagen',

      // Anweisungen und Hilfestellungen
      instruction: 'Bitte bewerte jede Dimension, indem du den Schieberegler bewegst. Du kannst den Regler ziehen oder auf die Skala klicken.',
      pleaseRate: 'Bitte bewerten',
      dragOrClick: 'Ziehe den Regler oder klicke, um deine Bewertung festzulegen'
    },

    // 7-Punkte Likert-Skala
    likert7: {
      // Vollständige Beschriftungen
      stronglyDisagree: 'Stimme überhaupt nicht zu',
      disagree: 'Stimme nicht zu',
      somewhatDisagree: 'Stimme eher nicht zu',
      neutral: 'Neutral',
      somewhatAgree: 'Stimme eher zu',
      agree: 'Stimme zu',
      stronglyAgree: 'Stimme voll zu',

      // Kurze Beschriftungen (für Buttons mit Zeilenumbrüchen)
      short: {
        stronglyDisagree: 'Stimme überhaupt\nnicht zu',
        disagree: 'Stimme\nnicht zu',
        somewhatDisagree: 'Stimme eher\nnicht zu',
        neutral: 'Neutral',
        somewhatAgree: 'Stimme\neher zu',
        agree: 'Stimme\nzu',
        stronglyAgree: 'Stimme\nvoll zu'
      }
    },

    // Sektion 2: Kontrolle, Handlungsfähigkeit & Engagement (6 Fragen)
    section2: {
      controlTask: 'Ich fühlte mich während des gesamten Prozesses in Kontrolle über die Aufgabe.',
      agencyDecisions: 'Ich konnte bedeutsame Entscheidungen darüber treffen, wie ich die Aufgabe angehe.',
      engagement: 'Ich blieb fokussiert und engagiert während der Arbeit mit dem System.',
      confidenceQuality: 'Ich bin zuversichtlich in der Qualität der Analyse, die ich erstellt habe.',
      trustResults: 'Ich vertraue den vom System produzierten Ergebnissen.',
      satisfaction: 'Insgesamt bin ich mit meiner Erfahrung mit diesem System zufrieden.'
    },

    // Sektion 3: Verständnis & Erklärbarkeit (6 Fragen)
    section3: {
      processTransparency: 'Ich verstand, was das System bei jedem Schritt tat.',
      predictability: 'Das Verhalten des Systems war vorhersehbar und konsistent.',
      understoodChoices: 'Ich verstand, warum das System bestimmte Entscheidungen traf.',
      understoodReasoning: 'Ich verstand die Begründung hinter den Vorschlägen des Systems.',
      couldPredict: 'Ich konnte vorhersagen, was das System als Nächstes tun würde.',
      couldExplain: 'Ich konnte erklären, wie das System zu seinen Schlussfolgerungen kam.'
    },

    // Sektion 4: Aufgabenleistung & Ergebnisse (8 Fragen)
    section4: {
      easeOfUse: 'Das System war einfach zu bedienen.',
      efficiency: 'Das System half mir, die Aufgabe effizient zu erledigen.',
      reasonableTime: 'Ich konnte die Aufgabe in einer angemessenen Zeit erledigen.',
      foundInsights: 'Das System half mir, die gesuchten Erkenntnisse zu finden.',
      exploredThoroughly: 'Das System half mir, die Daten gründlich zu untersuchen.',
      discoveredInsights: 'Ich entdeckte Erkenntnisse, die ich manuell nicht gefunden hätte.',
      accurateReliable: 'Die produzierten Ergebnisse waren genau und zuverlässig.',
      recommend: 'Ich würde dieses System anderen für ähnliche Aufgaben empfehlen.'
    },

    // Offene Fragen
    openEnded: {
      optional: 'Diese Fragen sind optional, aber dein Feedback ist wertvoll.',
      positive: 'Was hat dir am System am besten gefallen?',
      negative: 'Was hat dich frustriert oder könnte verbessert werden?',
      improvements: 'Hast du Verbesserungsvorschläge?',
      placeholder: 'Teile uns hier deine Gedanken mit…'
    }
  },
  // ========== WORKFLOW ==========
  workflow: {
    validation: {
      // Status Titles
      emptyWorkflow: 'Leerer Workflow',
      missingInput: 'Eingabe-Node fehlt',
      missingOutput: 'Ausgabe-Node fehlt',
      noConnections: 'Keine Verbindungen',
      incompletePath: 'Unvollständiger Workflow',
      configurationIncomplete: 'Konfiguration unvollständig',
      floatingNodesDetected: 'Unverbundene Nodes erkannt',
      readyToExecute: 'Bereit zur Ausführung',
      
      // Status Details
      statusDetails: {
        addNodes: 'Füge Nodes hinzu, um deinen Workflow zu erstellen',
        addInput: 'Füge einen Daten-Eingabe-Node hinzu, um zu beginnen',
        addOutput: 'Füge einen einen Ausgabe-Node hinzu, um den Workflow abzuschließen',
        connectNodes: 'Verbinde deine Nodes, um einen Workflow-Pfad zu erstellen',
        createPath: 'Erstelle einen Pfad von Eingabe- zu Ausgabe-Nodes',
        nodesConnected: '{{count}} Nodes korrekt verbunden',
        configureNodes: 'Konfiguriere alle erforderlichen Felder in den Nodes'
      },
      
      // Configuration Errors
      configErrors: {
        fieldRequired: '"{{field}}" ist erforderlich',
        multiselectRequired: '"{{field}}" muss mindestens eine Auswahl enthalten',
        singleNode: '"{{node}}" benötigt Konfiguration',
        multipleNodes: '{{count}} Nodes benötigen Konfiguration'
      },
      
      // Floating Nodes
      floatingNodes: {
        singleNode: '1 Node nicht verbunden: {{nodes}}',
        multipleNodes: '{{count}} Nodes nicht verbunden: {{nodes}}'
      }
    },
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
          description: 'Produktbewertungen aus der Datenbank laden. Das ist dein Ausgangspunkt - wählen deine Bewertungen nach Kategorie, Bewertung oder verifiziertem Kaufstatus aus.',
          config: {
            category: {
              label: 'Produktkategorie',
              help: 'Wähle aus, aus welcher Produktkategorie Bewertungen geladen werden sollen',
              placeholder: 'Kategorie wählen',
              options: {
                shoes: 'Schuhe',
                wireless: 'Kabellose Kopfhörer'
              }
            },
            limit: {
              label: 'Maximale Bewertungen',
              help: 'Begrenze die Anzahl der zu ladenden Bewertungen (leer lassen für alle)',
              placeholder: 'Keine Begrenzung'
            }
          }
        },
        
        filterReviews: {
          label: 'Bewertungen Filtern',
          type: 'Datenverarbeitung',
          description: 'Bewertungen nach bestimmten Kriterien wie Bewertungsbereich, verifizierten Käufen oder Schlüsselwörtern filtern. Grenzt deinen Datensatz auf relevante Einträge ein.',
          config: {
            field: {
              label: 'Filterspalte',
              help: 'Wähle nach welcher Spalte gefiltert werden soll',
              placeholder: 'Spalte wählen'
            },
            operator: {
              label: 'Filterbedingung',
              help: 'Wähle wie die Werte verglichen werden sollen',
              placeholder: 'Bedingung wählen'
            },
            value: {
              label: 'Filterwert',
              help: 'Gid den Wert zum Filtern ein',
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
              help: 'Wähle nach welcher Spalte sortiert werden soll',
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
                  help: 'Vergleiche Produkte mit Wettbewerbern und identifizieren Marktchancen'
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
          description: 'Die endgültige Ausgabe deines Workflows anzeigen. Dies ist der Endpunkt - es präsentiert die verarbeiteten Daten, Analyseergebnisse und Erkenntnisse.',
          note: 'Nur Daten, die von vorherigen Tools verfügbar sind, werden angezeigt. Nicht verfügbare Abschnitte werden markiert.',
          config: {
            includeSections: {
              label: 'Berichtsabschnitte',
              help: 'Wähle Abschnitte aus, die in deinem Bericht enthalten sein sollen',
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
              help: 'Wähle welche Statistiken eingeschlossen werden sollen',
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
          locked: 'Some settings are locked for this task and cannot be changed. These are pre-configured to ensure the task works correctly.',
          
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
      sidebar: {
        used: "verwendet",
        maxAllowed: "Begrenzt: {{current}}/{{max}} verwendet",
        maxReached: "Limit erreicht ({{max}} max)"
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
        configureNodes: 'Konfiguriere alle erforderlichen Felder'
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
        lockedFieldsNotice: 'Einige Einstellungen sind für diese Aufgabe gesperrt und können nicht geändert werden. Diese sind vorkonfiguriert, um die korrekte Funktion der Aufgabe zu gewährleisten.',
        fixErrors: 'Bitte {{count}} Fehler beheben',
        dependencyMissing: 'Benötigt: {{nodes}}',
        dependencyRecommended: 'Empfohlen: {{nodes}}'
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
      maxAllowedReached: "'{{name}}' kann nicht hinzugefügt werden: Maximum von {{max}} erlaubt",
      floatingNodesFiltered: "{{count}} unverbundene Node(s) wurden automatisch von der Ausführung entfernt",
      executionFailedWithError: 'Workflow-Ausführung fehlgeschlagen: {{error}}',
      validationFailedWithErrors: 'Workflow-Validierung fehlgeschlagen: {{errors}}',
      summaryReadyTitle: "Ergebnisse bereit!",
      summaryReadyDetails: "Klicke auf das Häkchen beim Show Results-Knoten, um deine Ergebnisse anzuzeigen"
    }
  },
  // ========== CHAT ==========
  chat: {
    aiAssistant: "KI Assistent",
    clearChat: "Chat Löschen",
    processing:"Wird verarbeitet…",
    send:"Abschicken",
    poweredBy:"Powered by KI Assistent mit autonomer Aufgabenausführung",
    summaryAvailable: {
      title: "Analysezusammenfassung verfügbar",
      description: "Klicke hier, um detaillierte Ergebnisse mit Erkenntnissen, Themen, Empfehlungen und Statistiken anzuzeigen."
    },
    working: "Assistent arbeitet…",
    placeholder:"Lass mich wissen, wie ich helfen kann… (Shift+Enter für eine neue Zeile)",
    disconnected: "Warten auf Verbindung…",
    clearConfirm: "Bist du sicher, dass du alle Nachrichten aus diesem Chat löschen möchtest?"
  },
  // ========== COMPLETION ==========
  completion: {
    title: 'Studie Abgeschlossen!',
    subtitle: 'Vielen Dank für diene Teilnahme',
    thankYou: 'Wir schätzen deinen Beitrag zu dieser Studie sehr. Alle deine Antworten wurden sicher gespeichert und werden uns helfen, besser zu verstehen, wie Menschen mit KI-Systemen interagieren.',
    
    summary: {
      title: 'Was du alles gemacht hast',
      
      demographics: 'Demographischer Fragebogen',
      demographicsDesc: 'Angaben zu deinem Hintergrund und deiner Erfahrung mit KI/ML-Tools',
      
      task1: 'Aufgabe 1: Kundenbewertungs-Analyse',
      task1Desc: 'Analyse von Bewertungen zu kabellosen Kopfhörern mit d zugewiesenen Tool',
      
      survey1: 'Fragebogen nach Aufgabe 1',
      survey1Desc: 'Ihre Erfahrungen und Rückmeldungen nach Aufgabe 1',
      
      task2: 'Aufgabe 2: Kundenbewertungs-Analyse',
      task2Desc: 'Analyse von Bewertungen zu Laufschuhen mit Ihrem zugewiesenen Tool',
      
      survey2: 'Fragebogen nach Aufgabe 2',
      survey2Desc: 'Deine Erfahrungen und Rückmeldungen nach Aufgabe 2',
      
      workflowBuilder: 'Workflow-Builder',
      aiAssistant: 'KI-Assistent'
    },
    
    contact: {
      title: 'Fragen oder Anmerkungen?',
      message: 'Wenn du Fragen zur Studie hast oder mehr über die Forschung erfahren möchtest, melde dich gerne bei:',
      email: 'benedikt.mast@stud.tu-darmstadt.de'
    },
    
    footer: 'Du kannst dieses Fenster jetzt schließen.'
  },
  // ========== SUMMARY ==========
  summary: {
    modal: {
      title: "Aufgabe {{taskNumber}} Analysezusammenfassung",
      subtitle: "{{count}} Datensätze analysiert • {{date}}",
      close: "Zusammenfassung schließen",
      closeButton: "Schließen",
      footer: "Abschnitte: {{available}} / {{requested}}"
    },
    sections: {
      executiveSummary: {
        title: "Zusammenfassung",
        basedOn: "Basierend auf {{count}} Datensätzen"
      },
      themes: {
        title: "Hauptthemen",
        prevalence: "Verbreitung",
        mentions: "{{count}} Erwähnungen",
        summary: "{{totalThemes}} Themen identifiziert aus {{recordsAnalyzed}} Datensätzen",
        bySentiment: "Themen nach Stimmung",
        aggregated: "Aggregierte Themen",
        positive: "Positive Themen",
        neutral: "Neutrale Themen",
        negative: "Negative Themen"
      },
      recommendations: {
        title: "Empfehlungen",
        impact: "Auswirkung",
        totalCount: "{{count}} Empfehlungen",
        highPriorityCount: "{{count}} hohe Priorität"
      },
      statistics: {
        title: "Statistiken & Metriken",
        sentimentDistribution: {
          title: "Stimmungsverteilung"
        },
        ratingDistribution: {
          title: "Bewertungsverteilung",
          averageRating: "Durchschnittsbewertung"
        },
        themeCoverage: {
          title: "Wichtigste identifizierte Themen",
          totalThemes: "{{count}} Themen insgesamt identifiziert"
        },
        additionalStats: {
          totalReviews: "Bewertungen gesamt",
          verified: "Verifiziert",
          avgBodyLength: "Durchschn. Textlänge",
          consistency: "Konsistenz"
        },
        sentimentConsistency: {
          title: "Stimmungs-Bewertungs-Konsistenz",
          totalCompared: "Gesamt verglichen",
          aligned: "Übereinstimmend",
          misaligned: "Nicht übereinstimmend",
          consistency: "Konsistenz",
          misalignmentPatterns: "Inkonsistenzmuster",
          highRatingNegative: "Hohe Bewertung + Negativ",
          lowRatingPositive: "Niedrige Bewertung + Positiv",
          neutralExtremes: "Neutrale Bewertung + Extreme"
        }
      },
      dataPreview: {
        title: "Datenvorschau",
        showing: "Zeige {{preview}} von {{total}} Datensätzen",
        columns: {
          reviewId: "Bewertungs-ID",
          headline: "Überschrift",
          rating: "Bewertung",
          sentiment: "Stimmung",
          verified: "Verifiziert"
        },
        reviewBody: "Bewertungstext"
      }
    }
  },
  // ========== CHAT EXECUTION ==========
  execution: {
    tool: {
      // Tool: load-reviews
      'clean-data': {
        start: {
          default: 'Daten werden bereinigt…',
          start: 'Datenbereinigung wird gestartet…'
        },
        progress: {
          default: 'Bereinigung läuft…',
          running: 'Daten werden verarbeitet…',
          missing_data_complete: '      -> {removed} Bewertungen mit Datenqualitätsproblemen entfernt',
          spam_complete: '      -> {removed} fehlerhafte Einträge erkannt und entfernt',
          duplicates_complete: '      -> {removed} doppelte Einträge gefunden',
          LLM_handoff: '      -> Analyse abgeschlossen'
        },
        end: {
          default: 'Datenbereinigung abgeschlossen',
          completed: 'Bereinigung abgeschlossen'
        },
        error: {
          default: 'Datenbereinigung fehlgeschlagen',
          failed: 'Datenbereinigung fehlgeschlagen',
          exception: 'Fehler bei Datenbereinigung'
        }
      },

      // Tool: clean-data
      'load-reviews': {
        start: {
          default: 'Bewertungsdaten werden geladen…',
          start: '{category}-Bewertungen werden geladen…'
        },
        progress: {
          default: 'Bewertungen werden verarbeitet…',
          running: 'Bewertungen werden geladen…',
          loading: '{records_loaded} von {total_available} Bewertungen geladen…',
          // keeping your detailed bullets and placeholders
          missing_data_complete: '      ➜ Removed {data.removed} reviews with missing data',
          spam_complete: '      ➜ Removed {data.removed} reviews with malformed data',
          duplicates_complete: '      ➜ {data.removed} duplicate reviews found',
        },
        end: {
          default: 'Bewertungen erfolgreich geladen',
          completed: '{records_loaded} {category}-Bewertungen erfolgreich geladen'
        },
        error: {
          default: 'Bewertungen konnten nicht geladen werden',
          failed: 'Bewertungen konnten nicht geladen werden',
          exception: 'Fehler beim Laden der Bewertungen'
        }
      },
      
      // Tool: filter-reviews
      'filter-reviews': {
        start: {
          default: 'Bewertungen werden gefiltert…',
          start: 'Filter werden angewendet…'
        },
        progress: {
          default: 'Filterung läuft…',
          running: 'Bewertungen werden durchsucht…'
        },
        end: {
          default: 'Bewertungen gefiltert',
          completed: 'Auf {count} Bewertungen gefiltert'
        },
        error: {
          default: 'Filterung fehlgeschlagen',
          failed: 'Filterung fehlgeschlagen',
          exception: 'Fehler beim Filtern'
        }
      },
      
      // Tool: sort-reviews
      'sort-reviews': {
        start: {
          default: 'Bewertungen werden sortiert…',
          start: 'Sortiervorgang wird gestartet…'
        },
        progress: {
          default: 'Sortierung läuft…',
          running: 'Bewertungen werden organisiert…'
        },
        end: {
          default: 'Bewertungen sortiert',
          completed: 'Sortierung abgeschlossen'
        },
        error: {
          default: 'Sortierung fehlgeschlagen',
          failed: 'Sortierung fehlgeschlagen',
          exception: 'Fehler beim Sortieren'
        }
      },
      
      // Tool: review-sentiment-analysis
      'review-sentiment-analysis': {
        start: {
          default: 'Sentiment wird analysiert…',
          start: 'Sentiment-Analyse wird gestartet…'
        },
        progress: {
          default: 'Sentiment wird analysiert und Themen werden extrahiert. Die Verarbeitungszeit variiert je nach Datenkomplexität und aktueller Serverauslastung.',
          running: 'Sentiment wird analysiert…'
        },
        end: {
          default: 'Sentiment-Analyse abgeschlossen',
          completed: 'Analyse abgeschlossen'
        },
        error: {
          default: 'Sentiment-Analyse fehlgeschlagen',
          failed: 'Sentiment-Analyse fehlgeschlagen',
          exception: 'Fehler bei Sentiment-Analyse'
        }
      },
      
      // Tool: generate-insights
      'generate-insights': {
        start: {
          default: 'Erkenntnisse werden generiert…',
          start: 'Erkenntnisgewinnung wird gestartet…'
        },
        progress: {
          default: 'Handlungsrelevante Erkenntnisse werden aus der Analyse generiert. Die Verarbeitungszeit variiert je nach Datenkomplexität und aktueller Serverauslastung.',
          running: 'Erkenntnisse werden generiert…'
        },
        end: {
          default: 'Erkenntnisse generiert',
          completed: 'Erkenntnisgewinnung abgeschlossen'
        },
        error: {
          default: 'Erkenntnisgewinnung fehlgeschlagen',
          failed: 'Erkenntnisgewinnung fehlgeschlagen',
          exception: 'Fehler bei Erkenntnisgewinnung'
        }
      },
      
      // Tool: show-results
      'show-results': {
        start: {
          default: 'Ergebnisse werden vorbereitet…',
          start: 'Ergebnisse werden geladen…'
        },
        progress: {
          default: 'Management-Zusammenfassung mit wichtigsten Erkenntnissen und Empfehlungen wird erstellt. Ausgabe wird finalisiert—dies dauert in der Regel weniger als 30 Sekunden.',
          running: 'Anzeige wird vorbereitet…'
        },
        end: {
          default: 'Ergebnisse bereit',
          completed: 'Ergebnisse angezeigt'
        },
        error: {
          default: 'Ergebnisse konnten nicht angezeigt werden',
          failed: 'Ergebnisse konnten nicht angezeigt werden',
          exception: 'Fehler beim Anzeigen der Ergebnisse'
        }
      },
      
      // Default tool (fallback)
      default: {
        start: {
          default: 'Tool wird gestartet…',
          start: 'Tool wird gestartet…'
        },
        progress: {
          default: 'Verarbeitung läuft…',
          running: 'Tool läuft…'
        },
        end: {
          default: 'Tool abgeschlossen',
          completed: 'Erfolgreich abgeschlossen'
        },
        error: {
          default: 'Tool fehlgeschlagen',
          failed: 'Tool fehlgeschlagen',
          exception: 'Tool-Fehler'
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
          start: '{data.step_number}. Loading reviews…'
        },
        progress: {
          default: 'Processing…',
          running: '{node_label} running…'
        },
        end: {
          default: 'Step completed',
          completed: '    Successfully loaded {data.results.total} reviews.\n',
          failed: '{node_label} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{data.error}',
          exception: '{data.error}'
        }
      },
      'clean-data': {
        start: {
          default: 'Starting step…',
          start: '{data.step_number}. Cleaning reviews…'
        },
        progress: {
          default: 'Processing…',
          running: '{node_label} running…'
        },
        end: {
          default: 'Step completed',
          completed: '    Successfully removed {data.results.summary.total_removed} low-quality reviews.\n    Remaining reviews: {data.results.summary.records_after}.\n    Data quality: {data.results.summary.quality_score}%.\n',
          failed: '{node_label} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{data.error}',
          exception: '{data.error}'
        }
      },
      'filter-reviews': {
        start: {
          default: 'Starting step…',
          start: '{data.step_number}. Filtering reviews…'
        },
        progress: {
          default: 'Processing…',
          running: '{node_label} running…'
        },
        end: {
          default: 'Step completed',
          completed: '    Successfully filtered reviews.\n    Removed {data.results.summary.records_removed} non matching reviews.\n    Remaining reviews: {data.results.summary.records_after}.\n',
          failed: '{node_label} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{data.error}',
          exception: '{data.error}'
        }
      },
      'sort-reviews': {
        start: {
          default: 'Starting step…',
          start: '{data.step_number}. Sorting reviews…'
        },
        progress: {
          default: 'Processing…',
          running: '{node_label} running…'
        },
        end: {
          default: 'Step completed',
          completed: '    Successfully sorted by {data.results.summary.sort_field} in {data.results.summary.sort_order} order.\n',
          failed: '{node_label} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{data.error}',
          exception: '{data.error}'
        }
      },
      'review-sentiment-analysis': {
        start: {
          default: 'Starting step…',
          start: '{data.step_number}. Analyzing sentiment and extracting themes…'
        },
        progress: {
          default: 'Processing…',
          running: '{node_label} running…'
        },
        end: {
          default: 'Step completed',
          completed: '{node_label} completed\n',
          failed: '{node_label} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{node_label} failed',
          exception: '{node_label} error'
        }
      },
      'generate-insights': {
        start: {
          default: 'Starting step…',
          start: '{data.step_number}. Generating insights…'
        },
        progress: {
          default: 'Processing…',
          running: '{node_label} running…'
        },
        end: {
          default: 'Step completed',
          completed: '{node_label} completed\n',
          failed: '{node_label} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{node_label} failed',
          exception: '{node_label} error'
        }
      },
      'show-results': {
        start: {
          default: 'Starting step…',
          start: '{data.step_number}. Preparing results…'
        },
        progress: {
          default: 'Processing…',
          running: '{node_label} running…'
        },
        end: {
          default: 'Step completed',
          completed: '    Results ready to view\n',
          failed: '{node_label} failed',
        },
        error: {
          default: 'Step failed',
          failed: '{data.error}',
          exception: '{data.error}'
        }
      },
      // Default node config (fallback)
      default: {
        start: {
          default: 'Schritt wird gestartet…',
          start: '{node_label} wird gestartet…'
        },
        progress: {
          default: 'Verarbeitung läuft…',
          running: '{node_label} läuft…'
        },
        end: {
          default: 'Schritt abgeschlossen',
          completed: '{node_label} abgeschlossen',
          failed: '{node_label} fehlgeschlagen'
        },
        error: {
          default: 'Schritt fehlgeschlagen',
          failed: '{node_label} fehlgeschlagen',
          exception: '{node_label} Fehler'
        }
      }
    },
    execution: {
      start: {
        default: 'Ausführung wird gestartet…',
        start: 'Ausführung gestartet'
      },
      progress: {
        default: 'Ausführung läuft…',
        running: 'Ausführung in Bearbeitung…'
      },
      end: {
        default: 'Ausführung abgeschlossen',
        failed: 'Ausführung fehlgeschlagen',
        completed: 'Ausführung abgeschlossen'
      },
      error: {
        default: 'Ausführung fehlgeschlagen',
        failed: 'Ausführung fehlgeschlagen',
        exception: 'Ausführungsfehler'
      }
    },

    // ============================================
    // TYPE: AGENT
    // ============================================
    agent: {
      start: {
        default: 'Agent startet…',
        start: 'Agent startet…',
        running: 'Agent analysiert Aufgabe…'
      },
      progress: {
        default: 'Agent arbeitet…',
        running: 'Agent verarbeitet…'
      },
      chat: {
        default: '{content}',
        completed: '{content}'
      },
      end: {
        default: 'Agent abgeschlossen',
        completed: '{summary}'
      },
      error: {
        default: 'Agent fehlgeschlagen',
        failed: 'Agent fehlgeschlagen',
        exception: 'Agent-Fehler'
      }
    }
  },
  // ========== ADMIN ==========
  admin: {
    sidebar: {
      dashboard: 'Dashboard',
      builder: 'Workflow-Builder',
      aiChat: 'KI-Assistent',
      templates: 'Vorlagen',
      executions: 'Ausführungen',
      analytics: 'Analytik',
      tutorials: 'Anleitungen',
      settings: 'Einstellungen'
    }
  }
}