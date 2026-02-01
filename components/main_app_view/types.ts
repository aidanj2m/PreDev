export type ViewState = 'input' | 'building' | 'loading' | 'viewing';

export interface MainAppProps {
  currentProjectId: string | null;
  onProjectChange: () => void;
  onCreateProjectWithAddress: () => Promise<string>;
}
