import styles from './SchemaTable.module.css';

/**
 * Pure presentational column table.
 * columns: [{ name, type, pk?, uq?, fk? }]
 */
const SchemaTable = ({ columns }) => (
    <table className={styles.cols}>
        <colgroup>
            <col style={{ width: '30%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '46%' }} />
        </colgroup>
        <thead>
            <tr>
                <th>Колонка</th>
                <th>Тип</th>
                <th>Ограничения</th>
            </tr>
        </thead>
        <tbody>
            {columns.map(c => (
                <tr key={c.name}>
                    <td>{c.name}</td>
                    <td className={styles.type}>{c.type}</td>
                    <td>
                        <div className={styles.badges}>
                            {c.pk && <span className={styles.pk}>PK</span>}
                            {c.uq && <span className={styles.uq}>UQ</span>}
                            {c.fk && <span className={styles.fk}>FK → {c.fk}</span>}
                        </div>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
);

export default SchemaTable;
