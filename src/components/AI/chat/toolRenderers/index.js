import WriteFileRenderer from './WriteFileRenderer';
import ReadFileRenderer from './ReadFileRenderer';
import RunCommandRenderer from './RunCommandRenderer';
import SearchFilesRenderer from './SearchFilesRenderer';
import ListDirectoryRenderer from './ListDirectoryRenderer';
import DefaultRenderer from './DefaultRenderer';

/**
 * Registry mapping tool names to renderer components.
 * Multiple aliases (dash- vs underscore-separated) are registered for the same
 * renderer so the agent can emit either style.
 *
 * Use {@link getToolRenderer} to look up a renderer with fallback to
 * {@link DefaultRenderer}. Add a new tool by creating `XxxRenderer.jsx` and
 * registering it below — no other code needs to change.
 */
const TOOL_RENDERERS = {
  'write-file': WriteFileRenderer,
  'write_file': WriteFileRenderer,
  'read-file': ReadFileRenderer,
  'read_file': ReadFileRenderer,
  'run-command': RunCommandRenderer,
  'run_command': RunCommandRenderer,
  'search-files': SearchFilesRenderer,
  'search_files': SearchFilesRenderer,
  'list_directory': ListDirectoryRenderer,
  'list-directory': ListDirectoryRenderer,
};

export function getToolRenderer(name) {
  return TOOL_RENDERERS[name] ?? DefaultRenderer;
}

export { DefaultRenderer };
