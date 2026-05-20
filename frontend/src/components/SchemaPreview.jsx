import { useState, useEffect } from 'react';
import { getSchemaInfo } from '../api/sandbox';
import SchemaTable from './SchemaTable';
import styles from './SchemaPreview.module.css';

// getSchemaInfo response → normalized columns
const toCols = (cols) => cols.map(c => ({
    name: c.column,
    type: c.type,
    pk:   c.primary_key,
    fk:   c.fk_ref ?? null,
}));

const SchemaPreview = ({ schemaKey }) => {
    const [open, setOpen]       = useState(false);
    const [tables, setTables]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    useEffect(() => {
        if (!open || !schemaKey) return;
        let cancelled = false;
        setTables(null);
        setError('');
        setLoading(true);
        getSchemaInfo(schemaKey)
            .then(r => {
                if (!cancelled)
                    setTables(Object.entries(r.data).map(([name, cols]) => ({ name, columns: toCols(cols) })));
            })
            .catch(() => { if (!cancelled) setError('Не удалось загрузить схему'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, schemaKey]);

    if (!schemaKey) return null;

    return (
        <div className={styles.wrap}>
            <button type="button" className={styles.toggle} onClick={() => setOpen(v => !v)}>
                {open
                    ? '▲ Скрыть структуру'
                    : `▼ Структура схемы${tables ? ` · ${tables.length} табл.` : ''}`}
            </button>

            {open && (
                <div className={styles.body}>
                    {loading && <p className={styles.hint}>Загрузка...</p>}
                    {error   && <p className={styles.error}>{error}</p>}
                    {tables  && tables.map(t => (
                        <div key={t.name} className={styles.tableBlock}>
                            <p className={styles.tableName}>{t.name}</p>
                            <SchemaTable columns={t.columns} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SchemaPreview;
