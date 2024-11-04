import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

export default function DiagnosticoTab({ id }) {
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [data, setData] = useState({ caracterizacion_id: id });
  const [tableName] = useState('pi_diagnostico');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFieldsAndRecords = async () => {
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

        // Obtener todos los registros con el mismo `caracterizacion_id`
        const recordsResponse = await axios.get(
          `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRecords(recordsResponse.data);
      } catch (error) {
        console.error('Error obteniendo los campos o datos:', error);
        setError('Error obteniendo los campos o datos');
      } finally {
        setLoading(false);
      }
    };

    fetchFieldsAndRecords();
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

      // Crear un nuevo registro sin actualizar
      await axios.post(
        `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/record`,
        recordData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Datos guardados exitosamente');
      setData({ caracterizacion_id: id }); // Limpiar el formulario después de guardar

      // Actualizar los registros después de agregar un nuevo registro
      const updatedRecords = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/records?caracterizacion_id=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecords(updatedRecords.data);
    } catch (error) {
      console.error('Error guardando los datos:', error);
      setError('Error guardando los datos');
    }
  };

  const handleDelete = async (recordId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/record/${recordId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecords((prevRecords) => prevRecords.filter((record) => record.id !== recordId));
      alert('Registro eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando el registro:', error);
      setError('Error eliminando el registro');
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
        <>
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
              Guardar
            </button>
          </form>

          <h4 className="mt-4">Registros guardados</h4>
          <table className="table">
            <thead>
              <tr>
                {fields.map((field) => (
                  <th key={field.column_name}>{field.column_name}</th>
                ))}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  {fields.map((field) => (
                    <td key={field.column_name}>{record[field.column_name]}</td>
                  ))}
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(record.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

DiagnosticoTab.propTypes = {
  id: PropTypes.string.isRequired,
};
