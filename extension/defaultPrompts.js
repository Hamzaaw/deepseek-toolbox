// DeepSeek Toolbox - Default Prompts
// Pre-built prompt templates for various categories

const DEFAULT_PROMPTS = {
  'development': [
    {
      id: 'dev-1',
      title: 'Code Review',
      description: 'Get a detailed code review with suggestions',
      content: 'Please review the following code and provide feedback on:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance improvements\n4. Security concerns\n\nCode:\n```{language}\n{code}\n```',
      variables: ['language', 'code']
    },
    {
      id: 'dev-2',
      title: 'Debug Helper',
      description: 'Help debug an issue in your code',
      content: 'I\'m encountering an issue with my code:\n\n**Error Message:**\n{error}\n\n**Code:**\n```{language}\n{code}\n```\n\n**Expected Behavior:**\n{expected}\n\n**Actual Behavior:**\n{actual}\n\nPlease help me identify and fix the issue.',
      variables: ['error', 'language', 'code', 'expected', 'actual']
    },
    {
      id: 'dev-3',
      title: 'Explain Code',
      description: 'Get a detailed explanation of code',
      content: 'Please explain the following code in detail:\n\n```{language}\n{code}\n```\n\nInclude:\n- What each part does\n- The overall purpose\n- Any important patterns or techniques used',
      variables: ['language', 'code']
    },
    {
      id: 'dev-4',
      title: 'Write Unit Tests',
      description: 'Generate unit tests for your code',
      content: 'Write comprehensive unit tests for the following {language} code using {framework}:\n\n```{language}\n{code}\n```\n\nInclude tests for:\n- Happy path scenarios\n- Edge cases\n- Error handling',
      variables: ['language', 'framework', 'code']
    },
    {
      id: 'dev-5',
      title: 'Refactor Code',
      description: 'Get suggestions to improve code structure',
      content: 'Please refactor the following code to improve:\n- Readability\n- Maintainability\n- Performance\n\n```{language}\n{code}\n```\n\nExplain the changes you made and why.',
      variables: ['language', 'code']
    },
    {
      id: 'dev-6',
      title: 'API Documentation',
      description: 'Generate API documentation',
      content: 'Generate comprehensive API documentation for the following code:\n\n```{language}\n{code}\n```\n\nInclude:\n- Function/method descriptions\n- Parameters and return types\n- Usage examples\n- Any important notes',
      variables: ['language', 'code']
    }
  ],
  'writing': [
    {
      id: 'write-1',
      title: 'Blog Post',
      description: 'Generate a blog post on any topic',
      content: 'Write a blog post about {topic}.\n\n**Target Audience:** {audience}\n**Tone:** {tone}\n**Length:** Approximately {length} words\n\nInclude an engaging introduction, clear sections, and a compelling conclusion.',
      variables: ['topic', 'audience', 'tone', 'length']
    },
    {
      id: 'write-2',
      title: 'Email Draft',
      description: 'Compose a professional email',
      content: 'Write a professional email with the following details:\n\n**Purpose:** {purpose}\n**Recipient:** {recipient}\n**Key Points:**\n{points}\n**Tone:** {tone}\n\nKeep it concise and professional.',
      variables: ['purpose', 'recipient', 'points', 'tone']
    },
    {
      id: 'write-3',
      title: 'Summarize Text',
      description: 'Get a concise summary of any text',
      content: 'Please summarize the following text in {length} sentences/paragraphs:\n\n{text}\n\nFocus on the main points and key takeaways.',
      variables: ['length', 'text']
    },
    {
      id: 'write-4',
      title: 'Improve Writing',
      description: 'Enhance and polish your writing',
      content: 'Please improve the following text:\n\n{text}\n\n**Focus on:**\n- Clarity and conciseness\n- Grammar and punctuation\n- Flow and readability\n- {additional_focus}\n\nProvide the improved version and explain key changes.',
      variables: ['text', 'additional_focus']
    },
    {
      id: 'write-5',
      title: 'Social Media Post',
      description: 'Create engaging social media content',
      content: 'Create a {platform} post about {topic}.\n\n**Goal:** {goal}\n**Tone:** {tone}\n**Include:** Relevant hashtags and a call-to-action',
      variables: ['platform', 'topic', 'goal', 'tone']
    }
  ],
  'business': [
    {
      id: 'biz-1',
      title: 'SWOT Analysis',
      description: 'Generate a SWOT analysis',
      content: 'Create a detailed SWOT analysis for {company_or_product}.\n\n**Context:** {context}\n\nProvide:\n- Strengths (internal positive factors)\n- Weaknesses (internal negative factors)\n- Opportunities (external positive factors)\n- Threats (external negative factors)\n\nInclude actionable insights for each section.',
      variables: ['company_or_product', 'context']
    },
    {
      id: 'biz-2',
      title: 'Meeting Agenda',
      description: 'Create a structured meeting agenda',
      content: 'Create a meeting agenda for:\n\n**Meeting Topic:** {topic}\n**Duration:** {duration}\n**Attendees:** {attendees}\n**Goals:** {goals}\n\nInclude time allocations, discussion points, and action items section.',
      variables: ['topic', 'duration', 'attendees', 'goals']
    },
    {
      id: 'biz-3',
      title: 'Project Proposal',
      description: 'Draft a project proposal',
      content: 'Write a project proposal for {project_name}.\n\n**Objective:** {objective}\n**Timeline:** {timeline}\n**Budget:** {budget}\n**Key Stakeholders:** {stakeholders}\n\nInclude executive summary, scope, deliverables, and success metrics.',
      variables: ['project_name', 'objective', 'timeline', 'budget', 'stakeholders']
    },
    {
      id: 'biz-4',
      title: 'Competitive Analysis',
      description: 'Analyze competitors in your market',
      content: 'Provide a competitive analysis for {company} in the {industry} industry.\n\n**Main Competitors:** {competitors}\n\nAnalyze:\n- Market positioning\n- Product/service comparison\n- Pricing strategies\n- Strengths and weaknesses\n- Opportunities for differentiation',
      variables: ['company', 'industry', 'competitors']
    }
  ],
  'academic': [
    {
      id: 'acad-1',
      title: 'Research Summary',
      description: 'Summarize academic research',
      content: 'Summarize the following research paper/article:\n\n{content}\n\nInclude:\n- Main research question/hypothesis\n- Methodology\n- Key findings\n- Conclusions and implications\n- Limitations',
      variables: ['content']
    },
    {
      id: 'acad-2',
      title: 'Essay Outline',
      description: 'Create a structured essay outline',
      content: 'Create a detailed essay outline for:\n\n**Topic:** {topic}\n**Type:** {essay_type}\n**Length:** {length} words\n**Key Arguments:** {arguments}\n\nInclude introduction, body paragraphs with supporting points, and conclusion.',
      variables: ['topic', 'essay_type', 'length', 'arguments']
    },
    {
      id: 'acad-3',
      title: 'Explain Concept',
      description: 'Get a clear explanation of any concept',
      content: 'Explain {concept} in simple terms.\n\n**Target Level:** {level}\n**Context:** {context}\n\nInclude:\n- Definition\n- Key principles\n- Real-world examples\n- Common misconceptions',
      variables: ['concept', 'level', 'context']
    },
    {
      id: 'acad-4',
      title: 'Study Guide',
      description: 'Create a study guide for a topic',
      content: 'Create a comprehensive study guide for {topic}.\n\n**Subject:** {subject}\n**Level:** {level}\n\nInclude:\n- Key concepts and definitions\n- Important formulas/principles\n- Practice questions\n- Summary of main points',
      variables: ['topic', 'subject', 'level']
    },
    {
      id: 'acad-5',
      title: 'Citation Helper',
      description: 'Format citations properly',
      content: 'Format the following source in {style} citation style:\n\n**Author(s):** {authors}\n**Title:** {title}\n**Publication:** {publication}\n**Year:** {year}\n**URL (if applicable):** {url}\n\nProvide both in-text citation and full bibliography entry.',
      variables: ['style', 'authors', 'title', 'publication', 'year', 'url']
    }
  ]
};
