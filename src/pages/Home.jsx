import React from 'react';

const Home = () => {
  return (
    <div className="page-container">
      <header className="app-header">
        <h1 className="app-title">Our Moments</h1>
      </header>
      <div className="timeline-content">
        <p style={{ color: 'var(--text-sub)' }}>아직 작성된 일상이 없습니다. 첫 번째 추억을 기록해보세요!</p>
      </div>
    </div>
  );
};

export default Home;
