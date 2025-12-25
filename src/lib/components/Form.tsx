'use client';
import {
    Form as RACForm,
    type FormProps,
    type LabelProps,
    Label as RACLabel,
    type FieldErrorProps,
    FieldError as RACFieldError,
    type ButtonProps,
    Button,
    type TextProps
} from 'react-aria-components';
import './Form.css';
import { Text } from './Content';

export function Form(props: FormProps) {
    return <RACForm {...props} />;
}

export function Label(props: LabelProps) {
    return <RACLabel {...props} />;
}

export function FieldError(props: FieldErrorProps) {
    return <RACFieldError {...props} />;
}

export function Description(props: TextProps) {
    return <Text slot="description" className="field-description" {...props} />
}

export function FieldButton(props: ButtonProps) {
    return <Button {...props} className="field-Button" />;
}
