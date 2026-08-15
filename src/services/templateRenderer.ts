import AppError from "../errors/AppError.js";
import type {
  EmailTemplate,
  RenderedEmail,
  TemplateVariables,
} from "../models/email.js";

const placeholderPattern = /{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function render(
  template: string,
  variables: TemplateVariables,
  escapeValues: boolean,
): string {
  const rendered = template.replace(
    placeholderPattern,
    (_placeholder: string, variableName: string) => {
      if (!Object.hasOwn(variables, variableName)) {
        throw new AppError(
          422,
          "TEMPLATE_VARIABLE_MISSING",
          `Required template variable is missing: ${variableName}.`,
        );
      }

      const value = String(variables[variableName]);
      return escapeValues ? escapeHtml(value) : value;
    },
  );

  if (/{{|}}/.test(rendered)) {
    throw new AppError(
      422,
      "TEMPLATE_RENDER_FAILED",
      "The email template contains an invalid placeholder.",
    );
  }

  return rendered;
}

export function renderEmailTemplate(
  template: EmailTemplate,
  variables: TemplateVariables,
): RenderedEmail {
  for (const variableName of template.requiredVariables) {
    if (!Object.hasOwn(variables, variableName)) {
      throw new AppError(
        422,
        "TEMPLATE_VARIABLE_MISSING",
        `Required template variable is missing: ${variableName}.`,
      );
    }
  }

  const subject = render(template.subjectTemplate, variables, false).trim();
  if (subject.length === 0 || subject.length > 998 || /[\r\n]/.test(subject)) {
    throw new AppError(
      422,
      "TEMPLATE_RENDER_FAILED",
      "The rendered email subject is invalid.",
    );
  }

  const rendered: RenderedEmail = { subject };
  if (template.htmlBodyTemplate !== null) {
    rendered.html = render(template.htmlBodyTemplate, variables, true);
  }
  if (template.textBodyTemplate !== null) {
    rendered.text = render(template.textBodyTemplate, variables, false);
  }

  return rendered;
}
