import { useId, type ChangeEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import Field, { fieldProps } from './Field';

interface Props {
  state: string;
  district: string;
  category?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export default function WorkProfileFields({ state, district, category, onChange }: Props) {
  const { t } = useTranslation();
  const prefix = useId();
  const fields = [
    ...(category === undefined ? [] : [{ name: 'category', value: category }]),
    { name: 'state', value: state },
    { name: 'district', value: district },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(({ name, value }) => {
        const id = prefix + name;
        return (
          <Field key={name} id={id} label={t('workProfile.' + name)}>
            <input {...fieldProps(id)} name={name} value={value} onChange={onChange} maxLength={100} />
          </Field>
        );
      })}
    </div>
  );
}
