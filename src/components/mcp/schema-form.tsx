'use client';

import Form from '@rjsf/core';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { useMemo } from 'react';

interface SchemaFormProps {
	schema: unknown;
	formData: Record<string, unknown> | undefined;
	onChange: (data: Record<string, unknown>) => void;
}

export default function SchemaForm({ schema, formData, onChange }: SchemaFormProps) {
	const typedSchema = useMemo<RJSFSchema | null>(() => {
		if (!schema || typeof schema !== 'object') {
			return null;
		}

		return schema as RJSFSchema;
	}, [schema]);

	const uiSchema = useMemo<UiSchema>(() => ({
		'ui:submitButtonOptions': {
			norender: true,
		},
	}), []);

	if (!typedSchema) {
		return null;
	}

	return (
		<Form
			className="rjsf-tailwind"
			validator={validator}
			schema={typedSchema}
			formData={formData}
			uiSchema={uiSchema}
			liveValidate
			showErrorList={false}
			onChange={({ formData: data }) => {
				onChange((data as Record<string, unknown>) ?? {});
			}}
		>
			<></>
		</Form>
	);
}
