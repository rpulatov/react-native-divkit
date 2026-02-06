import type { WrappedError } from "./wrapError";
import type { DivBase, TemplateContext } from "../../typings/common";
import type { DivBaseData } from "../types/base";

export function applyTemplate<T extends DivBase>(
  json: T,
  templateContext: TemplateContext,
  templates: Record<string, unknown>,
  _logError: (error: WrappedError) => void,
): {
  json: T;
  templateContext: TemplateContext;
};
export function applyTemplate(
  json: DivBaseData,
  templateContext: TemplateContext,
  templates: Record<string, unknown>,
  _logError: (error: WrappedError) => void,
): {
  json: DivBaseData;
  templateContext: TemplateContext;
} {
  const template = templates[json.type];

  if (!template) {
    // If template is missing, treat it as a standard component
    return {
      json,
      templateContext,
    };
  }

  let i;
  const newContext: TemplateContext = {};

  for (i in templateContext) {
    if (Object.prototype.hasOwnProperty.call(templateContext, i)) {
      newContext[i] = templateContext[i];
    }
  }

  for (i in json) {
    if (i === "type" || i === "__proto__") {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(json, i)) {
      newContext[i] = json[i as keyof typeof json];
    }
  }

  function copyTemplated(base: any, extender: any) {
    const keys = Object.keys(extender).filter((key) => key !== "__proto__");
    const simpleKeys = keys.filter((key) => key.charAt(0) !== "$");
    const templateKeys = keys.filter((key) => key.charAt(0) === "$");

    simpleKeys.forEach((key) => {
      const item = extender[key];

      if (typeof item === "object" && item !== null) {
        base[key] = Array.isArray(item) ? [] : {};
        copyTemplated(base[key], item);
      } else {
        base[key] = item;
      }
    });

    templateKeys.forEach((key) => {
      const item = extender[key];

      const val = newContext[item];

      if (val !== undefined) {
        const prop = key.substring(1);
        base[prop] = val;
      }
    });

    return base;
  }

  const newJson = copyTemplated({}, template);

  for (i in json) {
    if (i === "type" || i === "__proto__") {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(json, i)) {
      newJson[i] = json[i as keyof typeof json];
    }
  }

  return {
    json: newJson,
    templateContext: newContext,
  };
}

export function applyTemplatesRecursively(
  json: any,
  templates: Record<string, unknown>,
  logError: (error: WrappedError) => void,
): any {
  if (!json || typeof json !== "object") {
    return json;
  }

  if (Array.isArray(json)) {
    return json.map((item) =>
      applyTemplatesRecursively(item, templates, logError),
    );
  }

  let resolvedJson = json;

  // Attempt expansion if type matches a template
  if (json.type && templates[json.type]) {
    try {
      const res = applyTemplate(json, {}, templates, logError);
      resolvedJson = res.json;
    } catch (_e) {
      // Expansion failed
    }
  }

  // Recursively process children
  const result: any = {};
  for (const key in resolvedJson) {
    if (!Object.prototype.hasOwnProperty.call(resolvedJson, key)) continue;

    if (key === "type") {
      result[key] = resolvedJson[key];
      continue;
    }

    result[key] = applyTemplatesRecursively(
      resolvedJson[key],
      templates,
      logError,
    );
  }

  return result;
}
