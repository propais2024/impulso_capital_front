import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './css/UserView.css'; // Archivo de estilos separado

export default function UserView() {
  const { id } = useParams(); // Obtener el ID del usuario desde la URL
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]); // Estado para almacenar los roles disponibles
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [updatedData, setUpdatedData] = useState({ username: '', email: '', role_id: '', password: '', documento: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndRoles = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Token no encontrado. Por favor, inicia sesión nuevamente.');
        }

        // Obtener la información del usuario
        const userResponse = await axios.get(`https://impulso-capital-back.onrender.com/api/users/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Obtener los roles disponibles
        const rolesResponse = await axios.get('https://impulso-capital-back.onrender.com/api/roles', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(userResponse.data);
        setRoles(rolesResponse.data); // Almacenar los roles obtenidos
        setUpdatedData({
          username: userResponse.data.username,
          email: userResponse.data.email,
          role_id: userResponse.data.role_id, // Almacenar el ID del rol actual
          documento: userResponse.data.documento, // Inicializar el campo de documento
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user and roles data:', error);
        setAlert({ message: 'Error cargando los datos', type: 'error' });
        setLoading(false);
      }
    };

    fetchUserAndRoles();
  }, [id]);

  // Función para manejar la edición del usuario
  const handleEdit = () => {
    setEditMode(true);
  };

  // Función para guardar los cambios
  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `https://impulso-capital-back.onrender.com/api/users/${id}`,
        { ...updatedData },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setAlert({ message: 'Datos actualizados con éxito', type: 'success' });
      setEditMode(false);
    } catch (error) {
      console.error('Error updating user:', error);
      setAlert({ message: 'Error actualizando el usuario', type: 'error' });
    }
  };

  // Función para manejar cambios en el formulario
  const handleChange = (e) => {
    setUpdatedData({ ...updatedData, [e.target.name]: e.target.value });
  };

  return (
    <div className="content-wrapper">
      {/* Content Header (Page header) */}
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Detalle de Usuario</h1>
            </div>
            <div className="col-sm-6 d-flex justify-content-end">
              <button className="btn btn-secondary" onClick={() => navigate('/usuarios')}>
                Volver
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              {alert.message && (
                <div className={`alert alert-${alert.type}`}>{alert.message}</div>
              )}

              {loading ? (
                <div>Cargando...</div>
              ) : (
                <div className="card">
                  <div className="card-body">
                    {editMode ? (
                      <>
                        <div className="form-group">
                          <label>Nombre de usuario</label>
                          <input
                            type="text"
                            name="username"
                            className="form-control"
                            value={updatedData.username}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="form-group">
                          <label>Email</label>
                          <input
                            type="email"
                            name="email"
                            className="form-control"
                            value={updatedData.email}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="form-group">
                          <label>Documento</label>
                          <input
                            type="text"
                            name="documento"
                            className="form-control"
                            value={updatedData.documento}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="form-group">
                          <label>Rol</label>
                          <select
                            name="role_id"
                            className="form-control"
                            value={updatedData.role_id}
                            onChange={handleChange}
                          >
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.role_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Nueva Contraseña</label>
                          <input
                            type="password"
                            name="password"
                            className="form-control"
                            placeholder="Deja en blanco si no deseas cambiar la contraseña"
                            onChange={handleChange}
                          />
                        </div>
                        <button className="btn btn-success" onClick={handleSave}>
                          Guardar Cambios
                        </button>
                      </>
                    ) : (
                      <>
                        <p><strong>Nombre de usuario:</strong> {user.username}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Documento:</strong> {user.documento}</p>
                        <p><strong>Rol:</strong> {user.Role?.role_name || 'Sin rol'}</p>
                        <p><strong>Estado:</strong> {user.status === 1 ? 'Activo' : 'Inactivo'}</p>
                        <p><strong>Registrado:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                        <p><strong>Último Login:</strong> {user.last_login ? new Date(user.last_login).toLocaleString() : 'Nunca'}</p>
                        <button className="btn btn-primary" onClick={handleEdit}>
                          Editar Usuario
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

