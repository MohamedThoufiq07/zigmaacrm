"use client";

import NewWorkflowDrawer from "./NewWorkflowDrawer";

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateWorkflowModal(props: CreateWorkflowModalProps) {
  return <NewWorkflowDrawer {...props} />;
}
