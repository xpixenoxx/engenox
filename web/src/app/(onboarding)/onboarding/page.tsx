'use client';
// web/src/app/(onboarding)/onboarding/page.tsx
// Onboarding — 4-step flow: Brand → Queries → Consent → Dial

import { DialSliderCard, Panel, PanelDivider, PanelSection } from '@engenox/design-system/patterns';
import { Badge, Button, Input, Root as Progress, Select, Item as SelectItem } from '@engenox/design-system/primitives';
import { clsx } from 'clsx';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle, ChevronRight, Globe, Plus, Search, Shield, Users, Zap } from 'lucide-react';
import * as React from 'react';
import { Suspense } from 'react';


const steps = [
  { key: 'brand', label: 'Brand', icon: Globe, description: 'Configure your entity identity' },
  { key: 'queries', label: 'Buyer Queries', icon: Search, description: 'Define questions buyers ask AI' },
  { key: 'consent', label: 'Consent Panel', icon: Users, description: 'Set up human evaluation panel' },
  { key: 'dial', label: 'Autonomy Dial', icon: Zap, description: 'Configure intervention autonomy' },
];

interface OnboardingData {
  brand: {
    name: string;
    type: string;
    website: string;
    description: string;
    founded: string;
    founders: string;
    employees: string;
    industry: string;
    hq: string;
  };
  queries: string[];
  consent: {
    minPanelists: number;
    evaluationDays: number;
    blindMode: boolean;
    selfSelect: boolean;
  };
  dial: {
    level: 0 | 1 | 2 | 3;
    dryRun: boolean;
  };
}

const initialData: OnboardingData = {
  brand: {
    name: '',
    type: 'Organization',
    website: '',
    description: '',
    founded: '',
    founders: '',
    employees: '1-10',
    industry: '',
    hq: '',
  },
  queries: ['', '', ''],
  consent: {
    minPanelists: 3,
    evaluationDays: 7,
    blindMode: true,
    selfSelect: false,
  },
  dial: {
    level: 1,
    dryRun: true,
  },
};

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <Progress value={(currentStep / (steps.length - 1)) * 100} className="flex-1 h-1.5 max-w-md" />
      <div className="flex items-center gap-2 ml-4">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center gap-2">
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center text-body-xs font-medium transition-all',
              i < currentStep ? 'bg-success text-white' :
              i === currentStep ? 'bg-brand text-white' : 'bg-surface-muted text-text-muted'
            )}>
              {i < currentStep ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
            </div>
            {i !== steps.length - 1 && (
              <div className={clsx('w-16 h-0.5 hidden sm:block transition-colors',
                i < currentStep ? 'bg-success' : 'bg-border'
              )} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandStep({ data, onChange, onNext }: { data: OnboardingData['brand']; onChange: (data: Partial<OnboardingData['brand']>) => void; onNext: () => void }) {
  return (
    <Panel variant="outlined" density="comfortable">
      <PanelSection title="Brand Identity" description="Your entity attributes — used across all perception probes">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Entity Name *"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Engenox"
            helperText="Primary display name across all AI surfaces"
            required
          />
          <Select
            label="Entity Type *"
            value={data.type}
            onValueChange={(v) => onChange({ type: v })}
            required
          >
            <SelectItem value="Organization">Organization</SelectItem>
            <SelectItem value="Product">Product</SelectItem>
            <SelectItem value="Brand">Brand</SelectItem>
            <SelectItem value="Person">Person</SelectItem>
          </Select>
          <Input
            label="Website *"
            type="url"
            value={data.website}
            onChange={(e) => onChange({ website: e.target.value })}
            placeholder="https://engenox.com"
            helperText="Canonical URL for provenance linking"
            required
          />
          <Input
            label="Description *"
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="AI Visibility Operating System"
            helperText="One-sentence description for buyer awareness queries"
            required
          />
        </div>
        <PanelDivider className="my-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Founded"
            value={data.founded}
            onChange={(e) => onChange({ founded: e.target.value })}
            placeholder="2024 or 2024-01-15"
            helperText="YYYY or YYYY-MM-DD"
          />
          <Input
            label="Founders"
            value={data.founders}
            onChange={(e) => onChange({ founders: e.target.value })}
            placeholder="Pixenox Solutions"
            helperText="Comma-separated"
          />
          <Input
            label="Employees"
            value={data.employees}
            onChange={(e) => onChange({ employees: e.target.value })}
            placeholder="1-10"
            helperText="Range for public display"
          />
          <Input
            label="Industry"
            value={data.industry}
            onChange={(e) => onChange({ industry: e.target.value })}
            placeholder="Software / AI"
          />
          <Input
            label="Headquarters"
            value={data.hq}
            onChange={(e) => onChange({ hq: e.target.value })}
            placeholder="San Francisco, CA, USA"
          />
        </div>
      </PanelSection>
    </Panel>
  );
}

function QueriesStep({ data, onChange, onNext }: { data: OnboardingData['queries']; onChange: (data: OnboardingData['queries']) => void; onNext: () => void }) {
  return (
    <>
      <Panel variant="outlined" density="comfortable">
        <PanelSection
          title="Buyer Queries"
          description="Questions your buyers ask AI systems. These drive perception probes."
        >
          <div className="space-y-4">
            {data.map((query, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-body-xs text-text-muted font-mono w-6">{i + 1}.</span>
                <Input
                  value={query}
                  onChange={(e) => {
                    const newData = [...data];
                    newData[i] = e.target.value;
                    onChange(newData);
                  }}
                  placeholder={`Query ${i + 1}: e.g., "What is Engenox?"`}
                  className="flex-1"
                />
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => onChange([...data, ''])} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Query
            </Button>
          </div>
        </PanelSection>
      </Panel>

      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Query Templates" description="Quick-start with industry templates">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'SaaS / B2B', queries: ['What is {brand}?', 'How does {brand} compare to competitors?', 'What is {brand} pricing?', 'What integrations does {brand} support?'] },
              { name: 'E-commerce', queries: ['What is {brand}?', 'Is {brand} legitimate?', 'What is {brand} shipping policy?', 'What are {brand} reviews?'] },
              { name: 'Professional Services', queries: ['What does {brand} do?', 'Who founded {brand}?', 'What is {brand} expertise?', 'What are {brand} case studies?'] },
            ].map((template) => (
              <Button key={template.name} variant="secondary" size="md" className="h-36 flex flex-col items-start justify-center gap-2 p-4 text-left" onClick={() => onChange(template.queries.slice(0, 3))}>
                <h4 className="font-medium text-text">{template.name}</h4>
                <p className="text-body-xs text-text-muted">{template.queries.length} queries</p>
              </Button>
            ))}
          </div>
        </PanelSection>
      </Panel>
    </>
  );
}

function ConsentStep({ data, onChange, onNext }: { data: OnboardingData['consent']; onChange: (data: Partial<OnboardingData['consent']>) => void; onNext: () => void }) {
  return (
    <Panel variant="outlined" density="comfortable">
      <PanelSection title="Consent Panel Configuration" description="Human evaluators provide calibrated ground truth. Required for MVP candor floor.">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Minimum Panelists per Cycle"
              type="number"
              value={data.minPanelists}
              onChange={(e) => onChange({ minPanelists: Number.parseInt(e.target.value) })}
              min={3}
              max={20}
              helperText="Minimum consented panelists required for evaluation"
            />
            <Input
              label="Evaluation Deadline (days)"
              type="number"
              value={data.evaluationDays}
              onChange={(e) => onChange({ evaluationDays: Number.parseInt(e.target.value) })}
              min={1}
              max={30}
              helperText="Days for panelists to complete evaluation"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <div>
                <p className="font-medium text-text">Blind Evaluation Mode</p>
                <p className="text-body-xs text-text-muted">Hide brand identity from panelists during evaluation</p>
              </div>
              <input
                type="checkbox"
                checked={data.blindMode}
                onChange={(e) => onChange({ blindMode: e.target.checked })}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <div>
                <p className="font-medium text-text">Require Explicit Consent</p>
                <p className="text-body-xs text-text-muted">Panelists must consent before each evaluation cycle</p>
              </div>
              <input
                type="checkbox"
                checked={true}
                onChange={() => {}}
                disabled
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <div>
                <p className="font-medium text-text">Panelist Self-Selection</p>
                <p className="text-body-xs text-text-muted">Allow panelists to choose which queries to evaluate</p>
              </div>
              <input
                type="checkbox"
                checked={false}
                onChange={(e) => onChange({ selfSelect: e.target.checked })}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
            </div>
          </div>

          <div className="p-4 bg-brand/5 border border-brand/20 rounded-lg">
            <p className="text-body-sm text-brand font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              MVC Requirement: Minimum 3 consented panelists for Starter tier.
              Concierge add-on seeds your first 5 panelists.
            </p>
          </div>
        </div>
      </PanelSection>
    </Panel>
  );
}

function DialStep({ data, onChange, onComplete }: { data: OnboardingData['dial']; onChange: (data: Partial<OnboardingData['dial']>) => void; onComplete: () => void }) {
  const levels = [
    { level: 0, label: 'Observe', desc: 'Read-only. No proposals generated.', color: 'text-text-muted' },
    { level: 1, label: 'Propose', desc: 'Generate PRs. Human must approve & merge.', color: 'text-brand' },
    { level: 2, label: 'Approve', desc: 'Auto-merge approved PRs after review window.', color: 'text-warning' },
    { level: 3, label: 'Autonomous', desc: 'Execute without human gate (requires consent panel sign-off).', color: 'text-critical' },
  ];

  return (
    <div className="space-y-6">
      <DialSliderCard
        value={data.level}
        onChange={(v) => onChange({ level: v as 0|1|2|3 })}
        disabled={false}
        dryRunMode={data.dryRun}
        onDryRunToggle={(v) => onChange({ dryRun: v })}
      />

      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Dial Levels Explained" description="Four-tier autonomy — escalation requires signal + budget + consent">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {levels.map((l) => (
              <div key={l.level} className={clsx(
                'p-4 rounded-lg border transition-all',
                data.level === l.level ? 'border-brand bg-brand/5' : 'border-border/50'
              )}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={clsx('w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm',
                    data.level === l.level ? 'bg-brand text-white' : 'bg-surface-muted text-text-muted'
                  )}>
                    {l.level}
                  </span>
                  <span className={clsx('font-medium', l.color, data.level === l.level && 'text-brand')}>
                    {l.label}
                  </span>
                </div>
                <p className="text-body-sm text-text-muted">{l.desc}</p>
              </div>
            ))}
          </div>
        </PanelSection>
      </Panel>

      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Safety Rails" description="Built-in guardrails prevent unaudited autonomous actions">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-surface-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-medium text-text">Dry-run mode enabled by default</span>
              </div>
              <Badge variant="success" size="xs">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-brand" />
                <span className="font-medium text-text">Three-axis escalation gate (signal + budget + consent)</span>
              </div>
              <Badge variant="outline" size="xs">Required</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="font-medium text-text">Auto-demotion on alert-axis failure</span>
              </div>
              <Badge variant="warning" size="xs">Enforced</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-medium text-text">Conformal CI required for every uplift claim</span>
              </div>
              <Badge variant="success" size="xs">Required</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-brand" />
                <span className="font-medium text-text">Contrarian block renders on every positive finding</span>
              </div>
              <Badge variant="outline" size="xs">Candor Floor</Badge>
            </div>
          </div>
        </PanelSection>
      </Panel>
    </div>
  );
}

function OnboardingContent() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [data, setData] = React.useState<OnboardingData>(initialData);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      console.log('Onboarding complete:', data);
      window.location.href = '/dashboard';
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const canProceed = () => {
    if (currentStep === 0) return data.brand.name && data.brand.type && data.brand.website && data.brand.description;
    if (currentStep === 1) return data.queries.some(q => q.trim());
    return true;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Progress header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-heading-lg font-bold text-text">Welcome to Engenox</h1>
              <p className="text-body-sm text-text-muted mt-1">
                Set up your AI Visibility Operating System in 4 steps
              </p>
            </div>
            <Badge variant="outline" size="sm">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
          <StepIndicator currentStep={currentStep} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {currentStep === 0 && (
            <BrandStep
              data={data.brand}
              onChange={(d) => setData(prev => ({ ...prev, brand: { ...prev.brand, ...d } }))}
              onNext={handleNext}
            />
          )}
          {currentStep === 1 && (
            <QueriesStep
              data={data.queries}
              onChange={(d) => setData(prev => ({ ...prev, queries: d }))}
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <ConsentStep
              data={data.consent}
              onChange={(d) => setData(prev => ({ ...prev, consent: { ...prev.consent, ...d } }))}
              onNext={handleNext}
            />
          )}
          {currentStep === 3 && (
            <DialStep
              data={data.dial}
              onChange={(d) => setData(prev => ({ ...prev, dial: { ...prev.dial, ...d } }))}
              onComplete={handleNext}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleBack} disabled={isFirstStep}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            {isLastStep ? (
              <Button variant="primary" size="lg" onClick={handleNext} disabled={!canProceed()}>
                Complete Setup
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={handleNext} disabled={!canProceed()}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-body-xs text-text-muted text-center">
            By continuing, you agree to our <a href="/terms" className="underline hover:text-brand">Terms of Service</a> and <a href="/privacy" className="underline hover:text-brand">Privacy Policy</a>.
            Engenox uses your brand data solely for AI perception measurement — never for training.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading onboarding...</div></div>}>
      <OnboardingContent />
    </Suspense>
  );
}