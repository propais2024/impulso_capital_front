import { useState, useEffect } from 'react';
import axios from 'axios';

export default function UserAddTable() {
  const [tableName, setTableName] = useState('');
  const [fields, setFields] = useState([
    { name: '', type: 'VARCHAR(255)', isRelation: false, relatedTable: '', allow_null: true }
  ]);
  const [availableTables, setAvailableTables] = useState([]); // Tablas disponibles
  const [error, setError] = useState(''); // Estado para manejar errores
  const [prefix, setPrefix] = useState('inscription_'); // Estado para manejar el prefijo

  useEffect(() => {
    // Obtener las tablas disponibles para relaciones
    const fetchTables = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:4000/api/inscriptions/tables', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAvailableTables(response.data);
      } catch (error) {
        setError('Error obteniendo tablas disponibles');
      }
    };

    fetchTables();
  }, []);

  const handleAddField = () => {
    setFields([...fields, { name: '', type: 'VARCHAR(255)', isRelation: false, relatedTable: '', allow_null: true }]);
  };

  const handleFieldChange = (index, field) => {
    const updatedFields = fields.map((f, i) => (i === index ? field : f));
    setFields(updatedFields);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!tableName) {
      setError('El nombre de la tabla es requerido');
      return;
    }

    // Verificar que todos los campos tengan nombre
    if (fields.some(field => !field.name)) {
      setError('Todos los campos deben tener un nombre');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Concatenar el prefijo al nombre de la tabla
      const prefixedTableName = `${prefix}${tableName}`;

      const tableData = { table_name: prefixedTableName, fields };
      console.log('Datos enviados al backend:', tableData); // Verificar los datos antes de enviarlos

      await axios.post(
        'http://localhost:4000/api/inscriptions/create-table',
        tableData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Tabla creada con éxito');
    } catch (error) {
      console.error('Error en la creación de la tabla:', error.response);
      setError(error.response?.data?.message || 'Error creando la tabla'); // Mostrar error del backend si está disponible
    }
  };

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-body">
          <h1 className="card-title">Crear Tabla</h1>

          {/* Mostrar mensaje de error si existe */}
          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Prefijo de la Tabla:</label>
              <select className="form-control" value={prefix} onChange={(e) => setPrefix(e.target.value)}>
                <option value="inscription_">Inscription</option>
                <option value="provider_">Provider</option>
              </select>
            </div>

            <div className="form-group">
              <label>Nombre de la Tabla:</label>
              <input
                type="text"
                className="form-control"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Ingrese el nombre de la tabla"
              />
            </div>

            <h3 className="mt-4">Campos</h3>
            {fields.map((field, index) => (
              <div className="border p-3 mb-3" key={index}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Nombre del Campo</label>
                      <input
                        type="text"
                        className="form-control"
                        value={field.name}
                        onChange={(e) => handleFieldChange(index, { ...field, name: e.target.value })}
                        placeholder="Nombre del Campo"
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Tipo de Dato</label>
                      <select
                        className="form-control"
                        value={field.type}
                        onChange={(e) => handleFieldChange(index, { ...field, type: e.target.value })}
                      >
                        <option value="VARCHAR(255)">Texto Corto</option>
                        <option value="TEXT">Texto Largo</option>
                        <option value="INTEGER">Número Entero</option>
                        <option value="DECIMAL">Número Decimal</option>
                        <option value="BOOLEAN">Booleano</option>
                        <option value="DATE">Fecha</option>
                        <option value="FOREIGN_KEY">Clave Foránea</option>
                      </select>
                    </div>
                  </div>

                  {/* Checkbox para marcar si el campo es obligatorio */}
                  <div className="col-md-6">
                    <div className="form-group">
                      <div className="form-check mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={!field.allow_null}
                          onChange={(e) => handleFieldChange(index, { ...field, allow_null: !e.target.checked })}
                          id={`required-${index}`}
                        />
                        <label className="form-check-label" htmlFor={`required-${index}`}>
                          Obligatorio
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Seleccionar tabla relacionada si es clave foránea */}
                  {field.type === 'FOREIGN_KEY' && (
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Tabla Relacionada</label>
                        <select
                          className="form-control"
                          value={field.relatedTable}
                          onChange={(e) => handleFieldChange(index, { ...field, relatedTable: e.target.value })}
                        >
                          <option value="">-- Selecciona una tabla relacionada --</option>
                          {availableTables.map((table) => (
                            <option key={table.table_name} value={table.table_name}>
                              {table.table_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button type="button" className="btn btn-success" onClick={handleAddField}>
              Agregar Campo
            </button>
            <button type="submit" className="btn btn-primary ml-2">
              Crear Tabla
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}



