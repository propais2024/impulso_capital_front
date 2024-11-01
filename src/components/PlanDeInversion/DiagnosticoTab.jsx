import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

export default function DiagnosticoTab({ id }) {
  const [fields, setFields] = useState([]);
  const [data, setData] = useState({ caracterizacion_id: id });
  const [tableName] = useState('pi_diagnostico');
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFieldsAndData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Obtener campos de la tabla
        const fieldsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/fields`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFields(fieldsResponse.data);

        // Obtener registro existente filtrado por caracterizacion_id
        const recordsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (recordsResponse.data.length > 0) {
          const existingRecord = recordsResponse.data[0];
          setData(existingRecord);
          setRecordId(existingRecord.id);
        } else {
          setData((prevData) => ({ ...prevData, caracterizacion_id: id }));
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

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const recordData = { ...data, caracterizacion_id: id };

      if (recordId) {
        await axios.put(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/record/${recordId}`,
          recordData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Datos actualizados exitosamente');
      } else {
        await axios.post(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/record`,
          recordData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Datos guardados exitosamente');
      }
    } catch (error) {
      console.error('Error guardando los datos:', error);
      setError('Error guardando los datos');
    }
  };

  return (
    <div>
      <h3>Diagnóstico</h3>
      {loading ? (
        <p>Cargando campos...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <form onSubmit={handleSubmit}>
          {fields
            .filter((field) => field.column_name !== 'id')
            .map((field) => (
              <div className="form-group" key={field.column_name}>
                <label>{field.column_name}</label>
                <input
                  type="text"
                  name={field.column_name}
                  className="form-control"
                  value={data[field.column_name] || ''}
                  onChange={handleChange}
                  readOnly={field.column_name === 'caracterizacion_id'}
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

DiagnosticoTab.propTypes = {
  id: PropTypes.string.isRequired,
};
