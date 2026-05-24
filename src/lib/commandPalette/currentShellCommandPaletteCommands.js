import {
  SHELL_COMMAND_PRIORITY_STATUSES,
  getShellCommandPriority,
} from './shellCommandPriority.js';

const freezeArray = (items = []) => Object.freeze([...items]);

export function getCurrentShellCommandPaletteCommands(visibleCommands = [], profileId) {
  const commands = Array.isArray(visibleCommands) ? visibleCommands : [];
  const priority = getShellCommandPriority(profileId);

  if (!priority || priority.status !== SHELL_COMMAND_PRIORITY_STATUSES.ACTIVE) {
    return freezeArray(commands);
  }

  const visibleCommandsById = new Map(commands.map((command) => [command.id, command]));
  const orderedCommandIds = new Set();
  const prioritizedCommands = priority.commandIds.flatMap((commandId) => {
    const command = visibleCommandsById.get(commandId);

    if (!command || orderedCommandIds.has(commandId)) {
      return [];
    }

    orderedCommandIds.add(commandId);
    return [command];
  });

  const remainingCommands = commands.filter((command) => !orderedCommandIds.has(command.id));

  return freezeArray([...prioritizedCommands, ...remainingCommands]);
}
