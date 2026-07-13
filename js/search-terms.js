export const subjectTerms = {
  "staphylococcus aureus bacteremia": {
    label: "Staphylococcus aureus bacteremia",
    terms: [
      '"Staphylococcus aureus bacteremia"[Title/Abstract]',
      '"S. aureus bacteremia"[Title/Abstract]',
      '"Staphylococcus aureus bloodstream infection"[Title/Abstract]'
    ]
  },
  "infective endocarditis": {
    label: "Infective endocarditis",
    terms: [
      '"infective endocarditis"[Title/Abstract]',
      '"infectious endocarditis"[Title/Abstract]',
      'endocarditis[MeSH Terms]'
    ]
  },
  "clostridioides difficile infection": {
    label: "Clostridioides difficile infection",
    terms: [
      '"Clostridioides difficile infection"[Title/Abstract]',
      '"Clostridium difficile infection"[Title/Abstract]',
      '"C. difficile infection"[Title/Abstract]',
      '"Clostridioides difficile"[MeSH Terms]'
    ]
  },
  "community-acquired pneumonia": {
    label: "Community-acquired pneumonia",
    terms: [
      '"community-acquired pneumonia"[Title/Abstract]',
      '"community acquired pneumonia"[Title/Abstract]',
      '"community-acquired pneumonias"[Title/Abstract]'
    ]
  }
};

export const clinicalThemes = {
  "none": { label: "指定なし", terms: [] },
  "treatment": {
    label: "治療全般",
    terms: [
      'therapeutics[MeSH Terms]',
      'treatment[Title/Abstract]',
      'therapy[Title/Abstract]'
    ]
  },
  "treatment-duration": {
    label: "治療期間",
    terms: [
      '"treatment duration"[Title/Abstract]',
      '"duration of therapy"[Title/Abstract]',
      '"antibiotic duration"[Title/Abstract]',
      '"duration of antimicrobial therapy"[Title/Abstract]'
    ]
  },
  "oral-switch": {
    label: "経口薬への切り替え",
    terms: [
      '"oral switch"[Title/Abstract]',
      '"oral step-down"[Title/Abstract]',
      '"intravenous-to-oral"[Title/Abstract]',
      '"IV-to-oral"[Title/Abstract]'
    ]
  },
  "source-control": {
    label: "ソースコントロール",
    terms: [
      '"source control"[Title/Abstract]',
      '"infectious source control"[Title/Abstract]'
    ]
  },
  "culture-clearance": {
    label: "血液培養陰性化",
    terms: [
      '"culture clearance"[Title/Abstract]',
      '"blood culture clearance"[Title/Abstract]',
      '"clearance of bacteremia"[Title/Abstract]',
      '"time to blood culture clearance"[Title/Abstract]'
    ]
  },
  "diagnosis": {
    label: "診断",
    terms: [
      'diagnosis[Subheading]',
      'diagnosis[Title/Abstract]',
      'diagnostic[Title/Abstract]'
    ]
  },
  "rapid-diagnosis": {
    label: "迅速診断",
    terms: [
      '"rapid diagnosis"[Title/Abstract]',
      '"rapid diagnostic"[Title/Abstract]',
      '"rapid test"[Title/Abstract]',
      '"point-of-care"[Title/Abstract]'
    ]
  },
  "prognosis": {
    label: "予後",
    terms: [
      'prognosis[MeSH Terms]',
      'prognosis[Title/Abstract]',
      'outcome[Title/Abstract]',
      'mortality[Title/Abstract]'
    ]
  },
  "recurrence": {
    label: "再発",
    terms: [
      'recurrence[MeSH Terms]',
      'recurrence[Title/Abstract]',
      'relapse[Title/Abstract]'
    ]
  },
  "antimicrobial-resistance": {
    label: "薬剤耐性",
    terms: [
      '"drug resistance, microbial"[MeSH Terms]',
      '"antimicrobial resistance"[Title/Abstract]',
      '"antibiotic resistance"[Title/Abstract]'
    ]
  },
  "prevention": {
    label: "予防",
    terms: [
      'prevention and control[Subheading]',
      'prevention[Title/Abstract]',
      'prophylaxis[Title/Abstract]'
    ]
  }
};

export const studyDesignFilters = {
  "guideline": {
    label: "ガイドライン",
    terms: ['guideline[Publication Type]', 'practice guideline[Publication Type]']
  },
  "systematic-review": {
    label: "システマティックレビュー",
    terms: ['systematic review[Publication Type]']
  },
  "meta-analysis": {
    label: "メタ解析",
    terms: ['meta-analysis[Publication Type]']
  },
  "randomized-trial": {
    label: "ランダム化比較試験",
    terms: ['randomized controlled trial[Publication Type]']
  },
  "observational-study": {
    label: "観察研究",
    terms: [
      'observational study[Publication Type]',
      'cohort studies[MeSH Terms]',
      'case-control studies[MeSH Terms]'
    ]
  },
  "case-report": {
    label: "症例報告",
    terms: ['case reports[Publication Type]']
  }
};
