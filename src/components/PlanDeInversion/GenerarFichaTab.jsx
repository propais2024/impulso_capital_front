import { useState, useEffect } from 'react';
import PropTypes from 'prop-types'; // Importar PropTypes
import axios from 'axios';

export default function GenerarFichaTab({ id }) {
  const [fields, setFields] = useState([]);
  const [data, setData] = useState({});
  const [tableName] = useState('pi_generar_ficha'); // Nombre de la tabla pi_generar_ficha
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFieldsAndData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // Manejar redirección si no hay token
          return;
        }

        // Obtener campos de la tabla
        const fieldsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/fields`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setFields(fieldsResponse.data);

        // Obtener registro existente filtrado por caracterizacion_id
        const recordsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/records?caracterizacion_id=${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (recordsResponse.data.length > 0) {
          const existingRecord = recordsResponse.data[0];
          setData(existingRecord);
          setRecordId(existingRecord.id);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo los campos o datos:', error);
        setError('Error obteniendo los campos o datos');
        setLoading(false);
      }
    };

    fetchFieldsAndData();
  }, [tableName, id]);

  // Función para manejar cambios en los campos
  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  // Función para manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Manejar redirección si no hay token
        return;
      }

      const recordData = { ...data, caracterizacion_id: id };

      if (recordId) {
        // Actualizar registro existente
        await axios.put(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/record/${recordId}`,
          recordData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        alert('Ficha actualizada exitosamente');
      } else {
        // Crear nuevo registro
        await axios.post(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/record`,
          recordData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        alert('Ficha guardada exitosamente');
      }
    } catch (error) {
      console.error('Error guardando los datos:', error);
      setError('Error guardando los datos');
    }
  };

  return (
    <div>
      <h3>Generar Ficha</h3>
      {loading ? (
        <p>Cargando campos...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <form onSubmit={handleSubmit}>
          {fields.map((field) => (
            <div className="form-group" key={field.column_name}>
              <label>{field.column_name}</label>
              <input
                type="text"
                name={field.column_name}
                className="form-control"
                value={data[field.column_name] || ''}
                onChange={handleChange}
              />
            </div>
          ))}
          <button type="submit" className="btn btn-primary">
            {recordId ? 'Actualizar' : 'Guardar'}
          </button>
        </form>
      )}
    </div>
  );
}

// Definir las validaciones de propiedades
GenerarFichaTab.propTypes = {
  id: PropTypes.string.isRequired,
};
