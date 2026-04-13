import React, { useState , useEffect } from 'react';
import './TodoModal.css'; 

const TodoModal = ({ closeModal }) => {
  // 1. On récupère les tâches stockées au chargement (sinon liste vide [])
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("flow_todo_list");
    return saved ? JSON.parse(saved) : [];
  });

  const [newTask, setNewTask] = useState("");

  // 2. On sauvegarde les tâches dans le localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem("flow_todo_list", JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (e) => {
    e.preventDefault();
    if (newTask.trim() === "") return;
    setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
    setNewTask("");
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };


return (
    <div className="modal-overlay">
      <div className="todo-content">
        <div className="todo-header">
          <h2>✅ Ma To-Do List</h2>
          <button className="close-x" onClick={closeModal}>✕</button>
        </div>

        <form onSubmit={addTask} className="todo-input-section">
          <input 
            type="text" 
            placeholder="Ajouter une tâche..." 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <button type="submit">Ajouter</button>
        </form>

<div className="todo-list">
  {tasks.length === 0 ? (
    <p className="empty-msg">Aucune tâche pour le moment 🚀</p>
  ) : (
[...tasks].sort((a, b) => a.completed - b.completed).map(task => (      <div key={task.id} className={`todo-item ${task.completed ? 'done' : ''}`}>
        <div className="todo-left-side">
          <input 
            type="checkbox" 
            checked={task.completed} 
            onChange={() => toggleTask(task.id)} 
            className="todo-checkbox"
          />
          <span className="task-text">{task.text}</span>
        </div>
        <button onClick={() => deleteTask(task.id)} className="delete-btn">🗑️</button>
      </div>
    ))
  )}
</div>
      </div>
    </div>
  );
};

export default TodoModal;