export class PluginRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginRegistrationError';
  }
}

export class PluginNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginNotFoundError';
  }
}

export class CircularDependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircularDependencyError';
  }
}

export class CapabilityNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapabilityNotFoundError';
  }
}

// You might also want to add:
export class CapabilityConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapabilityConflictError';
  }
}

export class PluginInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginInitializationError';
  }
}

export class PluginConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginConfigurationError';
  }
}
