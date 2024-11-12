import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import logo from '../assets/img/logo-impulso-capital.png';
import './css/Aside.css';

export default function Aside() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const roleId = localStorage.getItem('role_id');
    const usernameStored = localStorage.getItem('username');
    const roleStored = localStorage.getItem('role_name');

    if (roleId) {
      setRole(parseInt(roleId, 10));
      setUsername(usernameStored);
      setUserRole(roleStored);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role_id');
    localStorage.removeItem('username');
    localStorage.removeItem('role_name');
    navigate('/login');
  };

  return (
    <>
      <aside className="main-sidebar main-sidebar-custom sidebar-dark-primary elevation-4">
        {/* Brand Logo */}
        <div className="brand-link">
          <Link to="/escritorio" className="brand-link">
            <img
              src={logo}
              alt="Impulso Capital Logo"
              className="brand-image"
            />
          </Link>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          {/* Sidebar user (optional) */}
          <div className="user-panel mt-3 pb-3 mb-3 d-flex">
            <div className="image">
              <img
                src="../../dist/img/avatar5.png"
                className="img-circle elevation-2"
                alt="User Image"
              />
            </div>
            <div className="info">
              <a href="#" className="d-block">
                {username}
              </a>
              <span className="d-block text-muted small">{userRole}</span>{" "}
              {/* Mostramos el rol */}
            </div>
          </div>

          {/* SidebarSearch Form */}
          <div className="form-inline">
            <div className="input-group" data-widget="sidebar-search">
              <input
                className="form-control form-control-sidebar"
                type="search"
                placeholder="Buscar"
                aria-label="Search"
              />
              <div className="input-group-append">
                <button className="btn btn-sidebar">
                  <i className="fas fa-search fa-fw" />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Menu */}
          <nav className="mt-2">
            <ul
              className="nav nav-pills nav-sidebar flex-column"
              data-widget="treeview"
              role="menu"
              data-accordion="false"
            >
              {/* Escritorio: visible para todos los roles */}
              <li className="nav-item">
                <Link to="/escritorio" className="nav-link">
                  <i className="nav-icon fas fa-th" />
                  <p>Escritorio</p>
                </Link>
              </li>

              {/* Gestionar Tablas: visible solo para superAdmin (role_id === 1) y oculto para role_id === 3 */}
              {role === 1 && role !== 3 && (
                <li className="nav-item">
                  <Link to="/list-tables" className="nav-link">
                    <i className="nav-icon fas fa-list-alt" />
                    <p>Gestionar Tablas</p>
                  </Link>
                </li>
              )}

              {/* Enlace a las tablas dinámicas de Empresas */}
              {role !== 3 && (
                <li className="nav-item">
                  <Link to="/dynamic-tables" className="nav-link">
                    <i className="nav-icon fas fa-building" />
                    <p>Empresas</p>
                  </Link>
                </li>
              )}

              {/* Enlace a las tablas dinámicas de Proveedores: visible solo para superAdmin */}
              {role === 1 && role === 3 && (
                <li className="nav-item">
                  <Link to="/provider-tables" className="nav-link">
                    <i className="nav-icon fas fa-briefcase" />
                    <p>Proveedores</p>
                  </Link>
                </li>
              )}

              {/* Nuevo enlace a las tablas de Plan de Inversión */}
              {role !== 3 && (
                <li className="nav-item">
                  <Link to="/pi-tables" className="nav-link">
                    <i className="nav-icon fas fa-chart-line" />
                    <p>Plan de Inversión</p>
                  </Link>
                </li>
              )}

              {/* Enlace para Descarga Masiva: visible solo para superAdmin y oculto para role_id === 3 */}
              {role === 1 && role !== 3 && (
                <li className="nav-item">
                  <Link to="/download-zip" className="nav-link">
                    <i className="nav-icon fas fa-download" />
                    <p>Descarga Masiva</p>
                  </Link>
                </li>
              )}

              {/* Usuarios: visible solo para superAdmin y oculto para role_id === 3 */}
              {role === 1 && role !== 3 && (
                <li className="nav-item">
                  <Link to="/usuarios" className="nav-link">
                    <i className="nav-icon fas fa-users" />
                    <p>Usuarios</p>
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>

        {/* Botones en la misma línea */}
        <div className="sidebar-custom d-flex justify-content-around align-items-center">
          <a href="#" className="btn btn-link">
            <i className="fas fa-cogs" />
          </a>
          <a href="#" className="btn btn-secondary">
            Ayuda
          </a>
          {/* Botón de Cerrar Sesión solo con icono */}
          <button
            className="btn btn-danger btn-icon-only"
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
        {/* /.sidebar-custom */}
      </aside>
    </>
  );
}

