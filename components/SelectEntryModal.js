import React, { useState } from 'react';
import Modal from 'react-modal';
import { TextField, List, ListItem, ListItemText } from '@mui/material';

const data = [
    { title: '链接1', url: 'https://example.com/1' },
    { title: '链接2', url: 'https://example.com/2' },
    { title: '链接3', url: 'https://example.com/3' },
    // ...
];


export default ()=>{
    const [isOpen, setIsOpen] = useState(false);
    const [searchText, setSearchText] = useState('');

    const filteredData = data.filter(item =>
        item.title.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <Modal isOpen={isOpen} onRequestClose={() => setIsOpen(false)}>
            <TextField
                label="搜索"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
            />
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
                <List>
                    {filteredData.map(item => (
                        <ListItem key={item.url} button component="a" href={item.url}>
                            <ListItemText primary={item.title} />
                        </ListItem>
                    ))}
                </List>
            </div>
        </Modal>
    )
}
