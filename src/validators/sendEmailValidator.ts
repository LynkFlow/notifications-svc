import { z } from "zod";

const emailAddressSchema = z
    .object({
        email: z.string().trim().email().max(320),
        name: z.string().trim().min(1).max(128).optional(),
    })
    .strict();

const recipientsSchema = z.array(emailAddressSchema).min(1).max(50);
const optionalRecipientsSchema = z.array(emailAddressSchema).max(50).optional();
const variableValueSchema = z.union([
    z.string().max(10_000),
    z.number().finite(),
    z.boolean(),
]);

export const sendEmailSchema = z
    .object({
        templateCode: z
            .string()
            .trim()
            .min(1)
            .max(100)
            .regex(/^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/),
        locale: z
            .string()
            .trim()
            .min(2)
            .max(16)
            .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/)
            .default("en"),
        to: recipientsSchema,
        cc: optionalRecipientsSchema,
        bcc: optionalRecipientsSchema,
        replyTo: emailAddressSchema.optional(),
        variables: z
            .record(
                z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
                variableValueSchema,
            )
            .refine((value) => Object.keys(value).length <= 100, {
                message: "No more than 100 template variables are allowed.",
            })
            .default({}),
    })
    .strict()
    .refine(
        (value) =>
            value.to.length +
                (value.cc?.length ?? 0) +
                (value.bcc?.length ?? 0) <=
            50,
        {
            message: "No more than 50 total recipients are allowed.",
            path: ["to"],
        },
    );

export type ValidatedSendEmailBody = z.infer<typeof sendEmailSchema>;
