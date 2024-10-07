import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Table() {
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timers, setTimers] = useState({});

  const fetchUserDetails = async (acceptedBy) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/registers/${acceptedBy}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  };

  const fetchAcceptedRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/leave');
      const requests = response.data;

      const filteredRequests = requests.filter((request) => {
        const leaveDate = new Date(request.leaveDate);
        const currentDate = new Date();
        const differenceInDays = (currentDate - leaveDate) / (1000 * 3600 * 24);
        return differenceInDays <= 2;
      });

      const updatedRequests = await Promise.all(
        filteredRequests.map(async (request) => {
          if (request.acceptedBy) {
            const userDetails = await fetchUserDetails(request.acceptedBy);
            return { ...request, acceptedUserDetails: userDetails };
          }
          return request;
        })
      );

      updatedRequests.sort((a, b) => new Date(b.leaveDate) - new Date(a.leaveDate));
      setAcceptedRequests(updatedRequests);

      updatedRequests.forEach(request => {
        const savedTimer = localStorage.getItem(`timer_${request._id}`);
        if (savedTimer && parseInt(savedTimer, 10) <= 0) {
          setTimers(prevTimers => ({
            ...prevTimers,
            [request._id]: 0,
          }));
        } else if (savedTimer) {
          setTimers(prevTimers => ({
            ...prevTimers,
            [request._id]: parseInt(savedTimer, 10),
          }));
        } else {
          setTimers(prevTimers => ({
            ...prevTimers,
            [request._id]: 4 * 60,
          }));
        }
      });

    } catch (error) {
      console.error('Error fetching accepted requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prevTimers => {
        const newTimers = {};
        Object.keys(prevTimers).forEach((requestId) => {
          const request = acceptedRequests.find(req => req._id === requestId);
          if (request && request.status === 'Accepted') {
            newTimers[requestId] = 0;
          } else if (prevTimers[requestId] > 0) {
            newTimers[requestId] = prevTimers[requestId] - 1;
            localStorage.setItem(`timer_${requestId}`, newTimers[requestId]);
          } else {
            newTimers[requestId] = 0;
            localStorage.setItem(`timer_${requestId}`, 0);
          }
        });
        return newTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [acceptedRequests]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  useEffect(() => {
    fetchAcceptedRequests();
  }, []);

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  return (
    <div className='container py-4'>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4><u><b className='text-dark'>Accepted Faculty Details :</b></u></h4>
        <button
          className="btn btn-warning"
          onClick={fetchAcceptedRequests}>
          &#x1F504; Refresh
        </button>
      </div>

      <div>
        {loading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <div className="table-responsive">
            <div style={{ position: 'relative', height: '400px', overflowY: acceptedRequests.length > 5 ? 'scroll' : 'unset' }}>
              <table className="table table-hover table-striped text-center border-warning" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead className='table-primary' style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th >Serial No.</th>
                    <th> Your Name</th>
                    <th>Leave Date</th>
                    <th  >Branch</th>
                    <th >Year</th>
                    <th >Semester</th>
                    <th >Faculty Name</th>
                    <th >Faculty Subject</th>
                    <th>Status</th>
                    <th>Timer</th>
                  </tr>
                </thead>
                <tbody className='bg-white border-dark'>
                  {acceptedRequests.length > 0 ? (
                    acceptedRequests.map((request, index) => (
                      <tr key={request._id} style={{
                        backgroundColor: request.status === 'Pending' ? '' : 'light',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                      }}>
                        <td>{index + 1}</td>
                        <td className="your-name">{request.name}</td>
                        <td>{formatDate(request.leaveDate)}</td>
                        <td className="branch">{request.branch}</td>
                        <td className="year">{request.acceptedUserDetails ? request.acceptedUserDetails.year : 'N/A'}</td>
                        <td className="semester">{request.acceptedUserDetails ? request.acceptedUserDetails.sem : 'N/A'}</td>
                        <td  className="faculty-name">{request.acceptedUserDetails ? request.acceptedUserDetails.name : 'N/A'}</td>
                        <td  className="faculty-subject">{request.acceptedUserDetails ? request.acceptedUserDetails.subj : 'N/A'}</td>
                        <td className={request.status === 'Pending' ? 'bg-warning' : 'bg-success text-white'}>
                          {request.status}
                        </td>
                        <td>{timers[request._id] > 0 ? formatTime(timers[request._id]) : <span>Timeup</span>}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="text-center">No accepted requests yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Table;
